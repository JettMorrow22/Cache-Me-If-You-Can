### GITLAB LINK: https://gitlab.com/natewilliams/CS4604-Group-Project

## Cache Me If You Can cachemeifyoucan.discovery.cs.vt.edu

### Goal

Cache Me If You Can is a web application designed to connect runners and facilitate group running activities. The platform enables runners to discover, join, and organize group runs based on their preferences, location, and schedule.

### Use Case

The application addresses the challenge of finding compatible running partners and organizing group runs. Whether you're a casual runner looking for a morning jog companion or a serious runner seeking pace-matched training partners, the platform helps you:

- **Discover Runs**: Browse available group runs in your area with advanced filtering by pace, distance, date, and location
- **Join Group Runs**: Easily join runs that match your fitness level and preferences
- **Organize Runs**: Run leaders can create and manage group runs, set routes, and coordinate with participants
- **Plan Routes**: Create custom running routes using interactive maps and save them for future use
- **Track Participation**: View your scheduled runs, manage your running calendar, and see your running history

The platform is particularly useful for running clubs, college running communities, and local running groups who want to coordinate group activities and connect runners with similar goals and abilities.

---

.env file

- In the server directory create a .env file with these fields and values
  specific to your local machine

  ```
  DB_HOST=localhost
  DB_USER=root
  DB_PASS={REPLACE_ME}
  DB_NAME=cache_me_if_you_can_db
  PORT=5050
  CLIENT_URL={PUT_CLIENT_URL}
  GOOGLE_MAPS_API_KEY={REPLACE_ME}
  JWT_SECRET={REPLACE_ME}
  ```

- In the client directory create .env file with these fields and google maps api key

```
REACT_APP_GOOGLE_MAPS_API_KEY={REPLACE ME}
JWT_SECRET={REPLACE ME}
```

Server

- You can start the backend by running node index.js in the server directory

Client

- You can start the frontend by running npm start in the client directory

## NOTE: all runs are in blacksburg and christiansburg within the database, so in the runfinder page, make sure to set search location to blacksburg or christiansburg to see runs

## Deployment (CS Launch / Kubernetes)

https://cachemeifyoucan.discovery.cs.vt.edu

This application is deployed using CS Launch (Virginia Tech's Kubernetes-based deployment platform). The deployment utilizes Kubernetes clusters, pods, and services to manage the containerized application.

### Architecture Overview

The application is deployed with the following components:

- **Frontend Pod**: Serves the React application using nginx
- **Backend Pod**: Runs the Node.js/Express server
- **Database**: External MySQL database (not containerized in Kubernetes)
- **Kubernetes Services**: Expose the frontend and backend pods
- **Ingress/CS Launch**: Provides public access to the application

### Deployment Process

#### 1. Build Docker Images

#### 2. Tag and Push Images to Docker Hub

#### 3. Create Kubernetes Deployments

#### 4. Create Kubernetes Services

#### 6. Create Kubernetes Secrets
