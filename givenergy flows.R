get_givenergy_data <- function() {

library(httr)
library(httr2)
library(jsonlite)
library(dplyr)
library(lubridate)
library(tidyr)
  
#GIVENERGY ----

#bearer token ----
givenergy_bearer <- Sys.getenv("givenergy_bearer")

#BASE URL ----
givenergy_url <- "https://api.givenergy.cloud"

###Energy flows ----
givenergy_path_energy_flows <- "v1/inverter/ED2052G003/energy-flows"

givenergy_queries_energy_flows <- list(start_time = Sys.Date() - 1, 
                                       end_time = Sys.Date() + 1,
                                       grouping = 0)

givenergy_full_url_energy_flows <- modify_url(url = givenergy_url, 
                                              query = givenergy_queries_energy_flows, 
                                              path = givenergy_path_energy_flows)

givenergy_energy_flows <- POST(url = givenergy_full_url_energy_flows, 
                               add_headers(Accept = "application/json", 
                                           `Content-Type` = "application/json",
                                           Authorization = paste("Bearer", givenergy_bearer)),
                               verbose()
                               )

givenergy_content_energy_flows <- fromJSON(content(givenergy_energy_flows, as = "text"))[[1]]
#[[1]] gives only the data in a list multileveled list, need to organise it into one df

#create empty dataframe that we will rbind each element of the list onto
givenergy_energy_flows_df <- tibble("start" = character(), 
                                    "end" = character(), 
                                    "PV to Home" = numeric(),
                                    "PV to Battery" = numeric(),
                                    "PV to Grid" = numeric(),
                                    "Grid to Home" = numeric(),
                                    "Grid to Battery" = numeric(),
                                    "Battery to Home" = numeric(),
                                    "Battery to Grid" = numeric())

names <- c("start", "end", "PV to Home", 
           "PV to Battery", "PV to Grid",
           "Grid to Home", "Grid to Battery", 
           "Battery to Home", "Battery to Grid")

#for each index in our list, this extracts the starttime and endtime and unlists the data so its a vector
#then it creates a dataframe of the data, and essentially cbind it to start and end - 9 columns
#then we name the temporary df cols, and row bind to our main one

for(i in seq_along(givenergy_content_energy_flows)){
  
  #first extract each bit of data we want, we just want the values not individual lists of 1 so we unlist
  start <- unlist(givenergy_content_energy_flows[i][[1]][1])
  end <- unlist(givenergy_content_energy_flows[i][[1]][2])
  
  #the data is a list of 7, so unlist is 7 rows
  data <- unlist(givenergy_content_energy_flows[[i]]$data)
  
  #t() is transpose - flip data - rows and columns swap
  data <- as.data.frame(t(data))
  
  #put these together, one row of start time, end time and data - 9 cols
  temp_df <- as.data.frame(tibble(start, end, data))
  
  #name the temporary dataframe - not necessary probably should be done outside of loop
  names(temp_df) <- names
  
  #then add this single row df to our main empty one, 
  #each index of the main list will add a row to the dataframe :)
  givenergy_energy_flows_df <- rbind(givenergy_energy_flows_df, temp_df)
}

#convert the start and end times into posixct
givenergy_energy_flows_df <- givenergy_energy_flows_df %>% mutate(start = ymd_hm(start),
                                                                  end = ymd_hm(end))

givenergy_energy_flows_df
}
