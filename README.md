slidewiki2.0
============

Installation guide

1. Install nodeJS
2. Install npm (nodeJS package manager) 
3. Install packages: npm install with no options
4. Install MYSQL
5. Import the SlideWiki database dump
6. Install MongoDB7. 
6. Copy the config.example file as config.js; adjust the settings for database connection7. 
8. Change MySql schema (in the root, sql_update.txt)
9. In nodeJS command line, start the application: node index.js (nodemon index.js)
8. Set up titles (in slide_revision): /scripts/setAllTitles
8. Convert MYSQL to MongoDB: /scripts/convert
9. Use it!
