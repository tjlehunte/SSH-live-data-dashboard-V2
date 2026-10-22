library(plumber)
library(later)

source("monnit script.R")
source("givenergy flows.R")

# In-memory cache
cache <- list(
  monnit    = NULL,
  givenergy = NULL
)

# ==== Monnit webhook -> dashboard cache ====
# Data flow: Monnit posts each gateway check-in to /monnit-webhook (endpoint further down)
#   -> parse_monnit_post() keeps only the Salford Smart Home readings the website plots
#   -> new ones are added to monnit_readings (one row per reading per figure)
#   -> rebuild_monnit_cache() turns them into the same wide table the old pull produced
#   -> cache$monnit, which /data serves straight from memory so the website loads quickly.
# Everything is in memory: a restart empties it, and it refills as new posts arrive.

monnit_tz <- "Europe/London"   # the dashboard shows UK local time; Monnit sends UTC

# Monnit's plotLabels -> the wording script.js looks for in column names.
# plotValues (not rawData) is used throughout: rawData gives the humidity ratio in
# grains per pound (7 times too high); plotValues gives it in grams per kilogram.
humidity_label_map <- c(Humidity          = "Humidity",
                        Celsius           = "Temperature",
                        DewPoint          = "Dewpoint",
                        GramsPerKilogram  = "gpkg",
                        HeatIndex_Celsius = "Heat Index",
                        WetBulb_Celsius   = "Wet Bulb")
current_label_map  <- c(`Amp Hours` = "Cumulative current (Ah)",
                        AvgCurrent  = "Average current",
                        MaxCurrent  = "Maximum current",
                        MinCurrent  = "Minimum current")

# Order the measures appear in /data, matching the old pull's column order
measure_order <- c("Dewpoint", "gpkg", "Heat Index", "Humidity", "Temperature", "Wet Bulb")

# Store of individual readings inside the dashboard window (the empty template fixes the column types)
empty_readings  <- data.frame(guid = character(), taken_utc = as.POSIXct(character(), tz = "UTC"),
                              column = character(), value = numeric(), stringsAsFactors = FALSE)
monnit_readings <- empty_readings

# Checks the shared secret on webhook requests.
# Exists because the endpoint is public: without it, anyone could post fake sensor data.
# Accepts the secret from an "X-Webhook-Token" header (preferred - headers stay out of
# request-path logs) or a ?token= query parameter (fallback).
# Fails closed: if monnit_webhook_token isn't set on Render, every request is refused.
webhook_authorised <- function(req) {
  expected <- Sys.getenv("monnit_webhook_token")
  if (!nzchar(expected)) return(FALSE)
  supplied <- req$HTTP_X_WEBHOOK_TOKEN
  if (is.null(supplied)) supplied <- req$argsQuery[["token"]]
  identical(supplied, expected)
}

# Turns one Monnit post into the readings the website needs, and nothing else.
#   body: the post, parsed from JSON into lists (one gateway check-in, many sensor messages).
# Returns one row per figure: guid (Monnit's reading ID, used to skip repeats),
# taken_utc (when the sensor took the reading), column (dashboard column name), value.
# Exists so that only network 6 humidity sensors and the current meter are kept: motion
# sensors and other buildings' networks are dropped here and never stored.
parse_monnit_post <- function(body) {
  rows <- lapply(body$sensorMessages, function(s) {
    if (!identical(as.character(s$networkID), "6")) return(NULL)           # Salford Smart Home only
    if (is.null(s$sensorName) || is.null(s$plotLabels) || is.null(s$plotValues) ||
        is.null(s$messageDate) || is.null(s$dataMessageGUID)) return(NULL)  # incomplete message: skip
    name   <- s$sensorName
    labels <- strsplit(s$plotLabels, "|", fixed = TRUE)[[1]]
    values <- suppressWarnings(as.numeric(strsplit(s$plotValues, "|", fixed = TRUE)[[1]]))
    if (length(labels) != length(values)) return(NULL)                      # malformed message: skip

    if (grepl("Humidity", name, ignore.case = TRUE)) {
      keep <- labels %in% names(humidity_label_map)
      if (!any(keep)) return(NULL)
      # FRAGILE: relies on Monnit names like "Hall - Humidity - 483538"; each measure replaces
      # "Humidity" in the middle, exactly as the old pull did (e.g. "Hall - Temperature - 483538")
      cols <- vapply(humidity_label_map[labels[keep]],
                     function(m) sub("Humidity - ", paste0(m, " - "), name, fixed = TRUE), character(1))
    } else if (grepl("Current", name, ignore.case = TRUE)) {
      keep <- labels %in% names(current_label_map)
      if (!any(keep)) return(NULL)
      # FRAGILE: assumes one current meter on network 6, as the old pull did;
      # a second meter would write into the same "Current - ..." columns
      cols <- paste0("Current - ", current_label_map[labels[keep]])
    } else {
      return(NULL)                                                          # e.g. motion sensors: not plotted
    }

    taken <- as.POSIXct(s$messageDate, tz = "UTC", format = "%Y-%m-%d %H:%M:%S")
    if (is.na(taken)) return(NULL)
    data.frame(guid = s$dataMessageGUID, taken_utc = taken, column = unname(cols),
               value = values[keep], stringsAsFactors = FALSE)
  })
  rows <- Filter(Negate(is.null), rows)
  out  <- if (length(rows) == 0) empty_readings else do.call(rbind, rows)
  out[!is.na(out$value), ]
}

# Rebuilds cache$monnit (what /data serves) from monnit_readings, and drops readings that
# have left the window so memory stays bounded.
# Window: midnight yesterday UK time to now - the same as the old pull's fromDate.
# Output matches the old pull: MessageDate in UK time floored to 10 minutes, figures
# averaged within each 10-minute bin, one column per sensor and measure.
rebuild_monnit_cache <- function() {
  window_start <- as.POSIXct(paste(as.Date(Sys.time(), tz = monnit_tz) - 1, "00:00:00"), tz = monnit_tz)
  window_start <- lubridate::with_tz(window_start, "UTC")   # same instant, in UTC to match taken_utc (avoids a time-zone warning)
  monnit_readings <<- monnit_readings[monnit_readings$taken_utc >= window_start, ]
  if (nrow(monnit_readings) == 0) {
    cache$monnit <<- NULL
    return(invisible(NULL))
  }
  binned <- monnit_readings |>
    dplyr::mutate(MessageDate = lubridate::floor_date(lubridate::with_tz(taken_utc, monnit_tz), "10 minutes")) |>
    dplyr::group_by(MessageDate, column) |>
    dplyr::summarise(value = mean(value), .groups = "drop")
  wide <- tidyr::pivot_wider(binned, names_from = column, values_from = value) |>
    dplyr::arrange(MessageDate)

  # Column order: current meter first, then each measure with rooms alphabetical (stable legend colours)
  cols    <- setdiff(names(wide), "MessageDate")
  current <- intersect(paste0("Current - ", current_label_map), cols)
  env     <- unlist(lapply(measure_order, function(m) sort(cols[grepl(paste0(" - ", m, " - "), cols, fixed = TRUE)])))
  cache$monnit <<- as.data.frame(wide[, c("MessageDate", current, env, setdiff(cols, c(current, env)))])
}
refresh_monnit <- function() {
  tryCatch({
    cache$monnit <<- get_monnit_data()
    message("Monnit refreshed: ", Sys.time())
  }, error = function(e) message("Monnit fetch error: ", e$message))
}

refresh_givenergy <- function() {
  tryCatch({
    cache$givenergy <<- get_givenergy_data()
    message("Givenergy refreshed: ", Sys.time())
  }, error = function(e) message("Givenergy fetch error: ", e$message))
}

schedule_refresh <- function() {
  # Monnit pull switched off (Oct 2026): the Monnit server moved to a VPN-only address, so
  # Render can no longer reach 146.87.171.55 ("Couldn't connect to server" in the Render log).
  # A failing attempt can also tie up this single R process, blocking the webhook endpoint.
  # Monnit data is to arrive via /monnit-webhook instead; refresh_monnit() is kept, unused,
  # until the webhook parsing replaces it.
  # refresh_monnit()
  rebuild_monnit_cache()   # rolls the window forward even if Monnit posts pause
  refresh_givenergy()
  later(schedule_refresh, delay = 540)
}

# Warm cache on startup, then refresh every 10 mins
schedule_refresh()

#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req$REQUEST_METHOD == "OPTIONS") return(list())
  forward()
}

# na = "null" keeps every column in every row (missing readings sent as null).
# script.js builds its sensor list from the FIRST row only, so without this, any sensor
# missing from the first 10-minute bin (common after a restart) would never be plotted.
#* @get /data
#* @serializer json list(na = "null")
function() {
  if (is.null(cache$monnit)) {
    list(error = TRUE, message = "Monnit data not yet available, try again shortly")
  } else {
    cache$monnit
  }
}

#* @get /givenergy
#* @serializer json
function() {
  if (is.null(cache$givenergy)) {
    list(error = TRUE, message = "Givenergy data not yet available, try again shortly")
  } else {
    cache$givenergy
  }
}

#* Receive Monnit webhook posts and add the Salford Smart Home readings to the dashboard cache
#* @post /monnit-webhook
#* @serializer unboxedJSON
function(req, res) {
  if (!webhook_authorised(req)) {
    res$status <- 401
    return(list(error = "unauthorised"))
  }

  body_text <- if (!is.null(req$bodyRaw)) rawToChar(req$bodyRaw) else req$postBody
  body <- tryCatch(jsonlite::fromJSON(body_text, simplifyVector = FALSE), error = function(e) NULL)

  # Problems are logged rather than returned as errors: an error reply would make Monnit
  # retry the same post, and a parsing problem would then repeat on every retry.
  tryCatch({
    if (is.null(body) || is.null(body$sensorMessages)) stop("post was not in Monnit's expected format")
    new_rows <- parse_monnit_post(body)
    new_rows <- new_rows[!(new_rows$guid %in% monnit_readings$guid), ]   # skip readings Monnit sends twice
    if (nrow(new_rows) > 0) {
      monnit_readings <<- rbind(monnit_readings, new_rows)
      rebuild_monnit_cache()
    }
    # One-line summary only - the readings themselves are not written to the Render log
    message("Monnit webhook: ", length(body$sensorMessages), " readings received, ",
            length(unique(new_rows$guid)), " new Salford Smart Home readings used")
  }, error = function(e) message("Monnit webhook processing error: ", conditionMessage(e)))

  list(received = TRUE)
}
#* @get /
function() {
  list(
    status  = "ok",
    message = "Plumber API is running, use the endpoint /data"
  )
}

#* @get /health
function() {
  list(health = "ok")
}
