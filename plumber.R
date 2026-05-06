library(plumber)
source("monnit script.R")   #monnit script
source("givenergy flows.R") #givenergy script

#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin", "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type")
  
  if (req$REQUEST_METHOD == "OPTIONS") {
    return(list())
  }
  
  forward()
}

#* @get /data
#* @serializer 
function() {
  tryCatch(
    {
      df <- get_monnit_data()
      df
    },
    error = function(e) {
      list(error = TRUE, message = e$message)
    }
  )
}

#* @get /givenergy
#* @serializer json
function() {
  tryCatch(
    {
      df <- get_givenergy_data()
      df
    },
    error = function(e) {
      list(error = TRUE, message = e$message)
    }
  )
}

#* @get /
function() {
  list(
    status = "ok",
    message = "Plumber API is running, use the endpoint /data"
  )
}

#* @get /health
function() {
  list(health = "ok")
}
