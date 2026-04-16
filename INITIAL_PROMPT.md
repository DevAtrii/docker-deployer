i want you to build docker-deployer app using python, flask,docker, nextjs, shadcn & tailwind css.

the app will consist of 2 parts:
- frontend (nextjs, shadcn, tailwind css)
- backend (python, flask, docker)


problem?
so i've a problem that i want some users to deploy their docker images, view stats, logs and start, stop, pause or delete their created containers without accessing the full server. 

solution:
docker-deployer, docker deployer is the admin panel which help them do the thing


backend:
- can be hosted on seperate server then frontend, frontend will communicate with backend using api calls, frontend can customise the api urls
- backend will have endpoints for:
    - deploy container
    - list containers
    - stop container
    - start container
    - pause container
    - resume container
    - delete container
    - view logs
    - view stats
    - view images
    - pull images
    - remove images
- there can be two types of users admin & user
- admin user can do things like install docker, give resources to users like ram, cpu & storage etc. admin can also do the same things as user
- user can only do the things like deploy container, list containers, stop container, start container, pause container, resume container, delete container, view logs, view stats, view images, pull images, remove images
- user will be assigned a folder inside `data` dir like `data/<user_id>/` and all the containers created by that user will be stored in that folder, user can access the whole dir like file manager, this will be the root for the user, user can create folders and files inside this folder, user can upload files to this folder, user can download files from this folder, user can delete files from this folder, user can edit files in this folder,
- for example user can attach volume for persistaint storage inside this folder, like `/data/<user_id>/<container_name>/data`
- pulled images for specific user will also be here
- when user will be creating account user will provide docker hub token optionally, if provided make sure when pulling images it uses the token to pull images.
- make sure each user activities like containers, credentials, resources, etc are isolated.
- in the local file system store the metadata related to user in json format
- use filesystem for the saving data like user pulled images etc
- get the base data dir from DEPLOYER_DATA_DIR env variable
- load .env file from backend/.env for backend, .env for frontend


frontend will be the simple frontend using next js for the exact backend. it will have all required pages



architecture:
both backend & frontend should follow data, domain & presentation clean architecture pattern


frontend:
use lucide icons, make sure the ui looks polished


note:
when done don't run backend & frontend yourself just give me the command & i'll run them,