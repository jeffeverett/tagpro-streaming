FROM thewtex/opengl:ubuntu1804

# Install software-properties-common so we can use add-apt-repository
RUN apt-get update && apt-get install -y \
    software-properties-common \
  && rm -rf /var/lib/apt/lists/*

# Add OBS Studio PPA
RUN add-apt-repository ppa:obsproject/obs-studio

# Add Yarn repository
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list

# Install via APT
RUN apt-get update && apt-get install -y \
    # Used by OBS
    ffmpeg \
    # Used by our project
    obs-studio \
    yarn \
  && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Place package.json and yarn.lock first (take advantage of cached layers)
COPY package.json yarn.lock ./

# Copy remaining source code
COPY . .

# Install
RUN yarn install

EXPOSE 80

ENTRYPOINT ["/bin/bash", "-c"]
CMD ["(/usr/bin/supervisord -c /etc/supervisor/supervisord.conf &>/tmp/log_supervisor &) && (/usr/src/app/server.js &>/tmp/log &) && /bin/bash"]
