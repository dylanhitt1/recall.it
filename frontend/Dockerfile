FROM node:8.12-alpine as builder
WORKDIR /code

COPY package.json /code/

# Install dependencies in `package.json` file
RUN yarn install
ADD . /code/.

ARG REACT_APP_BACKEND_URL

# Compile UI code
RUN REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL yarn build

## Stage 2: Setup ##
FROM nginx:1.13.3-alpine
COPY default.conf /etc/nginx/conf.d/

## Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

### Set up Nginx logging
RUN mkdir -p /etc/nginx/logs

RUN ln -sf /dev/stdout /etc/nginx/logs/access.log && ln -sf /dev/stderr /etc/nginx/logs/error.log

## From ‘builder’ stage copy over the artifacts in build folder to default nginx public folder
COPY --from=builder /code/build/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
