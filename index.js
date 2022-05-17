'use strict'

var mongoose = require('mongoose');
var app = require('./app');
var port = 3800;

//conexion base de datos 
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/curso_mean_social' , {  useNewUrlParser: true })
        .then(() => {
            console.log("La conexion a la base de datos Red-social se ha realizado correctamente");
       
            //Crear servidor
            app.listen(port, () => {
                console.log("servidor corrieno en el puerto 3800");
            })
        })
        .catch(err => console.log(err));