FROM node:10.14.0

RUN mkdir -p /app

RUN apt-get update
RUN apt-get update &&\
        apt-get install -y build-essential clang libdbus-1-dev libgtk2.0-dev \
        libnotify-dev libgnome-keyring-dev libgconf2-dev \
        libasound2-dev libcap-dev libcups2-dev libxtst-dev \
        gcc-multilib g++-multilib \
        libgtk2.0-0 libgconf-2-4 \
        libasound2 libxtst6 libxss1 libnss3 xvfb


WORKDIR /app

COPY package.json /app/
RUN yarn install

COPY . /app/

EXPOSE 3111

ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.2.1/wait /wait
RUN chmod +x /wait


CMD /wait

CMD echo "wait"

CMD /wait && yarn build && xvfb-run node dist/index.js
