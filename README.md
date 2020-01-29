# Recall.It

This project includes a Google Chrome Extension that allows consumers to view product recalls whilst they browse for products on Amazon.

# Project Structure

- `/extension` Includes the code to build a Google Chrome extension
- `/backend` Includes all server related files 
- `/frontend` Includes the React application that's show to the user

# Setup Instructions

Prerequisites

- python (version: 2.7)
- mongo/mongod/mongoimport (version: latest)
- node (version: latest)
- Google Chrome
- Docker

### Data load
####Load the database with all the csv files

`cd backend; yarn data:load`

#### Map Brands
Because companies tend to mispell their names on purpose we came up with an entity resolution algorithm and program to reduce false positives and also ensure A&E and A and E resolve to the same company. 

NOTE: You will get no results back from the server if you don't build and synchronize the brand table. In order to do so run the following command and follow the prompts. You must at lease **Build brand table** and **Sync brands**.

`cd backend; yarn data:map`

Choose rebuild brand database and then synchronize.

### Install the extension
In order to install the extension, navigate to [the chrome extensions](chrome://extensions/)

- Ensure developer mode is turned on
- Click `Load unpacked`
- Navigate to and select the extension directory found in the root of the project

### Build for development

####Start an instance of mongo

`docker-compose up mongo`

####Start the server

- Ensure you have all the right assets - `yarn install`
- Start it up - `yarn start`


### Build for production

Start up mongo and the server
`docker-compose up`

### Links
-[Admin Page](https://localhost:3001/app)

-[Test out the extension](https://localhost:3001/iframe?productTitle=Bassett%20Baby%20&%20Kids%20Destin%204-in-1%20Crib&brand=Bassett%20Baby%20&%20Kids&categories=Baby%20Products,Nursery,Furniture,Cribs%20&%20Nursery%20Beds,Cribs)

