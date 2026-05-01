library(plumber)
source("monnit script.R")   # your main script with get_monnit_data()

#* @get /data
#* @serializer json

#this function in the monnit script gets all the data, 
#splits it up, then joins it all back into one big dataframe
#has trycatch incase it fails it gives an error message

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


#* @get /
function() {
  list(
    status = "ok",
    message = "Monnit plumber API is running, use the endpoint /data"
  )
}

#* @get /health
function() {
  list(health = "ok")
}
