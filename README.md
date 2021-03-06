# heroku-craft-site

So the OpenSGF group is looking to change their hosting solution for a client's site. We have it hosted with
a company Fortrabbit, but our client's bank will not send money overseas to pay Fortrabbit.
The two alternatives we are weighing are a Digital Ocean Cloud Server running a LEMP Stack and heroku.
I am investigating heroku first as our parent organization 'Code for America' often is willing to pay the
heroku bill for sub-organization projects.

## The first question: Can you host a craft site on heroku at all?

After some quick googling, it definitely looks like a solved problem. 

This guide uses postgres instead of mysql supposedly because it is better supported:
https://torbensko.com/posts/2019/creating-a-site-using-craftcms-heroku-and-cloudcannon/

This guide builds upon the last one and provides some additional supplemental information:
https://dev.to/coda/how-to-deploy-craft-cms-with-postgres-on-heroku-1c2h
In the comments were some tools to aid with deployment I'm keeping here incase I need them later:
- https://deployer.org/
- https://deploybot.com/
- https://www.deployhq.com/
- https://envoyer.io/

## The final questions to answer before getting my hands dirty:
Is it feasible to have build scripts automatically or manually run after a git push?

This page in the heroku docs shows that heroku can listen for pushes to main and automatically act on them: https://devcenter.heroku.com/articles/github-integration
    
These two articles lead me to believe that you can choose the build commands that automatically run: https://devcenter.heroku.com/changelog-items/1573
https://devcenter.heroku.com/articles/php-support#build-behavior

This article definitively answers that heroku is very auto-build friendly: https://www.heroku.com/dynos/build

I still question if you can automatically run both a Node and Composer command. **edit** I just spoke with Levi, he thinks we can do away with the Node commands,
so this will be a php instance. Also, we will be using mysql instead of postgres.

How to ensure that the html/css in the web directory are not disrupted by heroku's behind the scene operations.
The problem:
https://help.heroku.com/K1PPS2WM/why-are-my-file-uploads-missing-deleted

One Potential Solution:
https://aws.amazon.com/cloudfront/getting-started/S3/
If after any changes, we store our content and static files in an S3 Bucket,
These files will be accessible with a link and credentials stored in the heroku
environmental variables and will persist through heroku instance resets.
Hopefully Craft can handle this.

So far, it all sounds doable. 

## The plan: set up a test craft site using postgres located at opensgf.ethanzitting.com
Tools Involved: PHP Heroku Build, Composer, Craft, Nginx, AS3, Mysql, Git

So, I created a simple app in heroku.com.

I'm not going to set it up in a pipeline yet.

I connected it to a new empty craft site repo on github and enabled automatic redeployments when the
main branch changes.

I made a new directory on my macbook heroku-craft-site

I cd'ed into it and ran `composer create-project craftcms/craft .`

It asks me if I am ready to set up craft. I tell it no. It tells me to run `php CURRENT_DIRECTORY/craft setup` when I'm ready.


Here I run into a preexisting problem. My mysql is giving me the following problem:
`ERROR 2002 (HY000): Can't connect to local MySQL server through socket '/tmp/mysql.sock' (2)`


I exit to make sure my mysql is running.
It was not, I run `brew services start mysql`
Then I run `mysql -u root -p` and type in my password
Login Successful

I run `SHOW DATABASES;` to see which ones currently exist.
I run `CREATE DATABASE herokuDB;` to create an empty test database.
I run `exit;` to exit mysql

I run `php craft setup` to resume setup. While setting up, I give it my mysql login information.

I get back "Installed Craft Successfully"

I open the file config/db.php.
This file retrieves the heroku environmental variables and makes them accessible to craft
The guide I'm following tells me to enter the following there:

    preg_match('|postgres://([a-z0-9]*):([a-z0-9]*)@([^:]*):([0-9]*)/(.*)|i', getenv('DATABASE_URL'), $matches);

    $user = $matches[1];
    $password = $matches[2];
    $server = $matches[3];
    $port = $matches[4];
    $database = $matches[5];

    return [
    'driver' => "pgsql",
    'server' => $server,
    'user' => $user,
    'password' => $password,
    'database' => $database,
    'schema' => getenv('DB_SCHEMA'),
    'tablePrefix' => getenv('DB_TABLE_PREFIX'),
    'port' => $port
    ];

I need to make sure this is not postgres specific. I'm sure this is important code to get things working.
It is not postgres specific aside from the 'driver' attribute. It's standard php code parsing the DATABASE_URL
variable that heroky provides.

I swap the 'driver' value out for mysql and save this file.

To run my local environment, I need to have some data stored in DATABASE_URL

I add the following to my .env file:
`DATABASE_URL="mysql://[MYSQL USERNAME]:@localhost:[PORT]/[MYSQL DB NAME]"`

This comes out to:
`DATABASE_URL="mysql://root:@localhost:3306/herokuDB"`

The IP and port were the default when craft was setting itself up. I assume they are correct.
**There is a potential for bugs on this step.**

I update .gitignore to include the following.

    /.env
    /.idea
    /.vscode
    /vendor
    .DS_Store
    storage/**
    !storage/.gitkeep
    config/license.key
    /node_modules
    !web/index.php
    !web/.htaccess
    !web/web.config
    web/*.js
    web/*.css
    web/*.png
    web/*.jpg
    web/*.jpeg
    web/assets/*
    web/mix-manifest.json
    assets/static/*

Basically, I want to keep images, keys, and generated public html/css/js out of the git repo

I run the following:

`git init` in my app's root directory

`git add .` to start tracking all unignored files in the project

`git commit -m 'first commit'`

`git remote add origin git@github.com:ethanzitting/heroku-craft-site.git` to link to github

I already had ssh permissions set up for my github.

`git checkout -b main` to fix my outdated git starting in master

`git branch -d master` removing master branch

`git push --set-upstream origin main` linking my local main branch to my github main branch

The guide I'm following now recommends the Heroky CLI. I install it: 
`brew tap heroku/brew && brew install heroku`

Now is the time to link mysql to this project

In the heroku settings, I am editing the config variables.
I think I need to edit JAWSDB_URL. My guide is saying that should probably be DATABASE_URL.
**Potential for Bug Here.**

config additions:
ENVIRONMENT="dev"
SECURITY_KEY="${craftSecurityKey}"
DB_SCHEMA="public"

My guide tells me I need to push my local database to heroku. He is doing it with postgres.
I will try to do it with mysql
I'm seeing commands that call the postgres pluging, so I will need to find the counterparts in my mysql plugin

I go to https://devcenter.heroku.com/articles/jawsdb

I need to link my local heroku cli to my heroku project
`heroku create`

I set my heroku project name to heroku-craft-site
`heroku git:remote -a heroku-craft-site`

`heroku addons:create jawsdb`
THIS GENERATED A JAWSDB_RED_URL, so I assume this is the replacement for DATABASE_URL
I swap the variables out in craft/db.php and .env

Current Step:
Configure my Heroku Project to use JawsDB, uploade my local mysql database to JawsDB, verify these.

Heard from Levi:
Upgrading my jawsDB made a duplication, causing the RED in the env var, I need to revisit that in db.php and .env
I just removed "RED_" from these two locatiions.

So I am going to dump my local database for the sakes of backing it up: 
`mysqldump -h OLDHOST -u OLDUSER -p OLDDATABASE > backup.sql`

This translated to: `mysqldump -h 127.0.0.1 -u root -p herokuDB > backup.sql`

I now want to upload this backup to my JAWS database.
`heroku config:get JAWSDB_URL`

This outputs the following information
mysql://NEWUSER:NEWPASS@NEWHOST:3306/NEWDATABASE

I now execute the following with that gleaned information
`mysql -h NEWHOST -u NEWUSER -p NEWDATABASE < backup.sql`

I think it was a success. My console quietly completed the command after a few minutes.

I create Procfile in the root directory. This is used by Heroky to run the app
In it, I add the line `web: vendor/bin/heroku-php-apache2 web`

I trust this tells heroku to spin up a php instance running apache to serve this site

This deployed the site, but all I see is an error: /app/storage doesn't exist or isn't writable by PHP. Please fix that.

I think this is related to php directory permissions, so I'll try starting the site locally
It could be that, or it could be an issue somewhere in my craft config files.
I'm researching other projects that use craft on heroku.

Running a script on compile that changes the directory permissions may be the way. I don't know where /app/storage would
be. I'm not sure why the app wants that directory.

I had my storage directory in .gitignore. I started tracking it and pushed it to main. That fixed the issue at
heroku.

My local craft is serving me a 503 error. I get the same error from heroku.

Looks like the issue is related to craft failing to access the database.

I just found 'postgres:' in my db.php that I forgot to change to mysql. I made that change.
Did not fix the issue.

I run: `composer update` and `composer install` for good measure

I push these changes up to gihub.

The heroku site now serves a craft landing page.
Big Success!

It tells me that it still needs imagick, though.
So now I investigate getting imagick in my php in heroku. It sounds like it cannot be added with composer.

I run: `composer update`

I add `"ext-imagick": "*",` to my composer.json require section and try pushing it up to heroku.
That didn't work, so I'll remove it and push that up.

I'm going to try to alter heroku's buildpack settings to incorporate some elses attempt at getting imagick into php
heroku buildpacks:add https://github.com/DuckyTeam/heroku-buildpack-imagemagick --index 1 --app heroku-craft-site

It's taking a very long time, and I think it's throwing lots of error codes?
That did not work, so I'm going to undo it.

`heroku plugins:remove heroku-repo`
`heroku buildpacks:remove https://github.com/DuckyTeam/heroku-buildpack-imagemagick`

TODO: try the composer.json way and do some sort of hard redeploy of the dyno

I added the following buildpack to run first: https://github.com/yespark/heroku-imagemagick-buildpack
no luck

I installed imagick locally, allowing me to run composer update and push my now accurate composer.lock to github'

GREAT SUCCESS! Craft login site is served my heroku

So on my windows rig:
I alread had composer and php installed with the relevant php extensions
So I created a directory called heroku-craft-site
I cloned the github repo into it, then ran composer install.
I had to hard code the local database into db.php to serve locally
I had to change my local mysql password as well, but then
everythin worked well.

Now I will work on recreating the Motherhood Reclaimed Environment to test NPM and Heroku together
`npm init -y`

I installed all the node modules from the motherhood reclaimed project.
Now I'm looking to have composer automatically install npm and it's modules on start up.

I added the following to the script section of my composer.json
`
"post-install-cmd": [
"npm install",
"npm mix"
]
`

After moving the nodejs buildpack first in the load order in heroku, it seems to succeed up to npm install.
I think `npm mix` is the wrong command.

I copy over the npm scripts from motherhood reclaimed:
`
"scripts": {
"dev": "mix",
"watch": "mix watch",
"production": "mix --production"
},
`

Doing this allows me to call laravel mix with `npm run production`
But it throws an error because I haven't added a laravel config file yet.
I create webpack.mix.js and import the contents from Motherhood reclaimed

I create the assets folder to match what webpack.mix.js expects.

I alter the run scripts in composer.json to `npm install`, `npm run production`

webpack compiles locally successfully
laravel mix compiles with an error in heroku, but heroku still serves me a craft site.

Now I'll add a bare template to craft to see if that will get served

# Migrating Motherhood Reclaimed to Heroku Dyno Hosting
 - Create a heroku account for openSGF.
 - Link the heroku account to the openSGF github account for automatic deploys on push to main.
 - Clone the Motherhood Reclaimed repo locally to my fresh install of MacOS.
 - I am currenty running PHP7.4, MySQL 8.0.27, Node 14.18.1, NPM 6.14.15,and Composer 2.1.10
 - I run `composer install` without issue.
 - I run `npm install` without issue.
 - I copy .env.example to .env.
 - I run `php craft setup` and punch in the site and database information.
 - I run `php craft migrate/all` and `php craft project-config/apply` with no issue or changes, where it is fresh from github.
 - I run `npm run watch` in one terminal tab.
 - I run `php craft serve 0.0.0.0:8000` in another.
 - I am now seeing a version of the motherhood reclaimed website served locally. It has no content in it.
 - I punch in a ton of dummy content into the CMS admin portal, and it seems to be served perfectly.

 - I now wish to edit ./config/db.php to link it to mySQL locally and JawsDB remotely eventually.
 - Per my previous experimenting, I want to add to it the following:
    ```preg_match('|mysql://([a-z0-9]*):([a-z0-9]*)@([^:]*):([0-9]*)/(.*)|i', getenv('DATABASE_URL'), $matches);

        $user = $matches[1];
        $password = $matches[2];
        $server = $matches[3];
        $port = $matches[4];
        $database = $matches[5];

        return [
        'driver' => "mysql",
        'server' => $server,
        'user' => $user,
        'password' => $password,
        'database' => $database,
        'schema' => getenv('DB_SCHEMA'),
        'tablePrefix' => getenv('DB_TABLE_PREFIX'),
        'port' => $port
        ];
    ```
 - I can see a version of this already exists there though, likely added for the previous FortRabbit hosting.
 - I overwrite what needs to be overwritten and leave the rest:
    ```
    preg_match('|mysql://([a-z0-9]*):([a-z0-9]*)@([^:]*):([0-9]*)/(.*)|i', getenv('DATABASE_URL'), $matches);

    $user = $matches[1];
    $password = $matches[2];
    $server = $matches[3];
    $port = $matches[4];
    $database = $matches[5];

    return [
        'dsn' => App::env('DB_DSN') ?: null,
        'driver' => "mysql",
        'server' => $server,
        'port' => $port,
        'database' => $database,
        'user' => $user,
        'password' => $password,
        'schema' => getenv('DB_SCHEMA'),
        'tablePrefix' => getenv('DB_TABLE_PREFIX'),
        'charset' => 'utf8',
        'collation' => 'utf8_unicode_ci',
    ];
    ```

 - I add the following to the end of my .env file: `DATABASE_URL="mysql://root:@localhost:3306/herokuDB"`
 - This is to allow my code in db.php to function locally as well.
 - I create a Procfile in my project root and add to it `web: vendor/bin/heroku-php-apache2 web`
 - I add the following buildpacks in the heroku.com settings: NodeJS, PHP
 - I add the following variables to the config variables settings in heroku.com.
    ```
    ENVIRONMENT="dev"
    SECURITY_KEY="${craftSecurityKey}"
    DB_SCHEMA="public"
    ```
 - I add `"ext-imagick": "*",` to my composer-json required section in anticipation of that craft requirement.

 - I run `heroku create`
 - I run `heroku git:remote -a motherhood-reclaimed`
 - My personal github account does not seem to have the permission to do what it needs to do to the repo.
 - This only affects the method I previously used to push the data up to JawsDB
 - The Heroku CLI is therefore unnecessary, and I will need to push the data up another way.

 - I run `mysqldump -h 127.0.0.1 -u root -p herokuDB > backup.sql` without issue.
 - I think the next step is to find JawsDB's instructions for uploading the database
 - I download Sequel Pro to connect to the remote JawsDB database. I was not able to connect.
 - I run `mysql -h NEWHOST -u NEWUSER -pNEWPASS NEWDATABASE < backup.sql` with my JawsDB credentials.
 - It completes quietly, so I assume it was a success. I'll retry sequel pro to verify the upload.
 - Sequel Pro crashes for the second try on attempt. I'll try VSCode
 - I successfully connected to this database with VSCode. I do not see the local database I tried to upload though.
 - I will continue hoping that craft can work with the database that is there for now.
 - I assume this step will be revisited once the client data is ready to be uploaded.

 - I push my changes in Procfile, composer.json, and config/db.php up to main to attempt the first build.
 - Heroku is now presenting me with a craft error code page.

 - I edit config/db.php to change `DATABASE_URL` to `JAWSDB_URL`
 - I add the following to the script section of my composer.json
    ```
    "post-install-cmd": [
    "npm install",
    "npm mix"
    ]
    ```
 - I push these changes up to github.
 - The Heroku build fails.
 - This is because I do not have php imagick locally, so I could not update the composer.lock
 - I install php imagick locally and run `composer update` without issue.
 - I push this change up to github.
 - The heroku build makes it through the Node initialization and the PHP initialization, but fails in the post-load composer scripts.
 - I change the scripts in question to:
    ```
    "post-install-cmd": [
      "npm install",
      "npm run mix --production"
      ]
    ```
 - I push this change up.
 - This script does not success either. I get the error code "missing script: mix". Running this command locally would have told me this.
 - I update the script in question to `npm run production`.
 - The motherhood reclaimed site is now successfully served by Heroku.
 
 TODO:
 - Set up an S3 Bucket to store assets.
 - Upload client data to JawsDB.
 - Link motherhoodreclaimed.org to Heroku