library(plumber)
library(later)

source("monnit script.R")
source("givenergy flows.R")

# In-memory cache
cache <- list(
  monnit    = NULL,
  givenergy = NULL
)

# ==== Monnit webhook: logging-only stage ====
# Holds the most recent raw posts from the Monnit webhook. The only purpose at this
# stage is to SEE what Monnit sends (field names, format, how often, whether it is one
# post per sensor or per gateway check-in) before writing any parsing.
# In memory only, so it is wiped on every restart/redeploy - fine for inspection,
# not suitable as the dashboard's data store.
webhook_log     <- list()
webhook_log_max <- 20   # cap so memory can't grow without limit if Monnit posts often

# Checks the shared secret on webhook requests.
# Exists because the endpoint is public: without it, anyone could post fake sensor data.
# Accepts the secret from an "X-Webhook-Token" header (preferred - headers stay out of
# request-path logs) or a ?token= query parameter (fallback, in case Monnit's webhook
# settings don't allow custom headers).
# Fails closed: if monnit_webhook_token isn't set on Render, every request is refused.
webhook_authorised <- function(req) {
  expected <- Sys.getenv("monnit_webhook_token")
  if (!nzchar(expected)) return(FALSE)
  supplied <- req$HTTP_X_WEBHOOK_TOKEN
  if (is.null(supplied)) supplied <- req$argsQuery[["token"]]
  identical(supplied, expected)
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

#* @get /data
#* @serializer json
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

#* Receive raw posts from the Monnit webhook (logging only - not yet fed to the dashboard)
#* @post /monnit-webhook
#* @serializer unboxedJSON
function(req, res) {
  if (!webhook_authorised(req)) {
    res$status <- 401
    return(list(error = "unauthorised"))
  }

  # Use the untouched bytes rather than plumber's parsed version, so we see exactly what
  # Monnit sent whatever format it turns out to be. postBody is the older plumber field,
  # kept as a fallback.
  body_text <- if (!is.null(req$bodyRaw)) rawToChar(req$bodyRaw) else req$postBody
  if (is.null(body_text)) body_text <- ""

  entry <- list(
    received_at  = format(Sys.time(), "%Y-%m-%d %H:%M:%S", tz = "Europe/London"),
    content_type = if (is.null(req$CONTENT_TYPE)) NA_character_ else req$CONTENT_TYPE,
    body         = body_text
  )

  # Append, then keep only the newest webhook_log_max entries
  webhook_log <<- utils::tail(c(webhook_log, list(entry)), webhook_log_max)

  # Also write to the Render log, truncated so one huge post can't flood it.
  # Deliberately no sender IP address - keeps to the "no IPs in application code" rule.
  message("Monnit webhook received (", nchar(body_text), " chars): ",
          substr(body_text, 1, 2000))

  # Reply 200 straight away; a webhook sender typically treats anything else as a failed delivery
  list(received = TRUE)
}

#* View the last few raw Monnit webhook posts (same secret required)
#* @get /monnit-webhook/log
#* @serializer unboxedJSON
function(req, res) {
  if (!webhook_authorised(req)) {
    res$status <- 401
    return(list(error = "unauthorised"))
  }
  # Show each body as parsed JSON for readability; if it isn't valid JSON
  # (format still unknown at this stage), fall back to the raw text.
  lapply(webhook_log, function(entry) {
    entry$body <- tryCatch(jsonlite::fromJSON(entry$body, simplifyVector = FALSE),
                           error = function(e) entry$body)
    entry
  })
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
