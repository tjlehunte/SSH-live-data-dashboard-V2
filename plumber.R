library(plumber)
library(later)

source("monnit script.R")
source("givenergy flows.R")

# In-memory cache
cache <- list(
  monnit    = NULL,
  givenergy = NULL
)

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
  refresh_monnit()
  refresh_givenergy()
  later(schedule_refresh, delay = 600)
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
