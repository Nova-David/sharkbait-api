# SHARKBAIT API USAGE:

******************
User functions 
******************

- GET:   Get a user by their UID using http://api.sharkbait-app.ml/users/{id}
    > Returns object with user columns  
    > Returns { notfound } if user does not exist  
- POST:  Update user information by their UID using http://api.sharkbait-app.ml/users/{id}
    > Requires columns that will be updated { column1, column2, ... }  
    > Returns { success }
- POST:  Login a user by using http://api.sharkbait-app.ml/verify
    > Requires { uid, password }  
    > Returns { valid: true/false }  
    > Returns { notfound, valid } if user does not exist

**************************
Friend System functions 
**************************

- POST: Send a friend request using http://api.sharkbait-app.ml/friends/add
    > Requires { uid, friend }  
    > Returns { success }
- POST: Accept a friend request using http://api.sharkbait-app.ml/friends/accept
    > Requires { uid, friend }  
    > Returns { success }
- POST: Reject a friend request using http://api.sharkbait-app.ml/friends/reject
    > Requires { uid, friend }  
    > Returns { success }
- POST: Check if a user has sent another user a friend request using http://api.sharkbait-app.ml/friends/sent
    > Requires { uid, friend }  
    > Returns { sent: true/false }
- POST: Remove a user from your friends using using http://api.sharkbait-app.ml/friends/remove
    > Requires { uid, friend }  
    > Returns { success }

**************************************
SELECT and INSERT from/to any table 
**************************************

- GET:     Select all rows from any table by using http://api.sharkbait-app.ml/{table}
    > Returns array of objects equivalent to number of rows found
- POST:    Insert or update a row within any table by using http://api.sharkbait-app.ml/{table}
    > Requires {PRIMARY KEY, (column2, column3, ...)}  
    > Returns { success }
- DELETE:  Insert or update a row within any table by using http://api.sharkbait-app.ml/{table}
    > Requires {PRIMARY KEY}  
    > Returns { success }
- POST:    Select a single row from any table by using http://api.sharkbait-app.ml/{table}/find
    > Requires {PRIMARY KEY}  
    > Returns object with columns  
    > Returns { notfound } if selection does not exist
- PATCH:   Update a single row from any table by using http://api.sharkbait-app.ml/{table}
    > Requires { keys, column1, column2, ... }  
    > { keys } should contain an object with all the primary keys  
    > Returns { success }


\* { error, message } always returns if an error occurred.