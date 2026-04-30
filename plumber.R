library(plumber)
source("monnit script.R")   # your main script with get_monnit_data()

#* @get /data
#* @serializer json

#this function in the monnit script gets all the data, 
#splits it up, then joins it all back into one big dataframe
function() {
  df <- get_monnit_data()
  df
}