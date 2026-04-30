FROM rocker/r-ver:4.3.2

RUN apt-get update && apt-get install -y \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    && rm -rf /var/lib/apt/lists/*

RUN echo "force rebuild"

RUN R -e "install.packages(c('plumber', 'jsonlite', 'httr2', 'httr', 'dplyr', 'lubridate', 'tidyr', 'stringr', 'purrr'), repos='https://cloud.r-project.org/')"

WORKDIR /app
COPY . /app

EXPOSE 8000

CMD ["R", "-e", "pr <- plumber::pr('plumber.R'); pr$run(host='0.0.0.0', port=8000)"]
