'use strict'
var bcrypt = require('bcrypt-nodejs');
var mongoosePaginate = require('mongoose-pagination');
const user = require('../models/user');

var fs = require('fs');
var path = require('path');


var User = require('../models/user');
var jwt = require('../services/jwt');
var Follow = require('../models/follow');
const { remove, exists } = require('../models/user');
const follow = require('../models/follow');
const { AsyncLocalStorage } = require('async_hooks');



function home(req, res){
    res.status(200).send({
        message: 'Accion de pruebasen el servodor node'
    });
}

function pruebas(req, res){
    res.status(200).send({
        message: 'Accion de pruebasen el servodor node'
    });
}

function saveUser(req, res){
    var params = req.body;
    var user = new User();

    if(params.name && params.surname && params.nick && params.email && params.password){

            user.name = params.name;
            user.surname = params.surname;
            user.nick = params.nick;
            user.email = params.email;
            user.role = 'ROLE USER';
            user.image = null;

            //usiarios duplicados no se aceptan 
            User.find({ $or: [
                {email: user.email.toLowerCase()},
                {nick: user.nick.toLowerCase()}
            ]}).exec((err, users) => {
                if(err) return res.status(500).send({message:'Error en la peticion del usuario'});

                if(users && users.length >= 1){
                    return res.status(200).send({message:'el usuario ya esta en uso'});
                }else{
                    bcrypt.hash(params.password, null, null, (err, hash) => {
                        user.password = hash;
                        
                        user.save((err, userStored) => {
                            if(err) return res.status(500).send({message: 'Error al guardar el usuario'});
         
                            if(userStored){
                                res.status(200).send({user:userStored});
                            }else{
                              res.status(404).send({message: 'No se ha registrado el usuario'});  
                            
                             }
                        });
                     });
                }
            });

            

        }else{
            res.status(200).send({
                message: 'Envia todos los componentes nesesarios'
            });
        }
}

// Login 
function loginUser(req, res){
    var params = req.body;

    var email = params.email;
    var password = params.password;

    User.findOne({email: email}, (err, user) =>{
        if(err) return res.status(500).send({message:'Error en la peticion'});

        if(user){
            bcrypt.compare(password, user.password, (err, check) =>{
                if(check){
                    
                    if(params.gettoken){
                        //devolver token 
                        //generar token

                        return res.status(200).send({
                            token: jwt.createToken(user)
                        });

                    }else{
                       //devolver datos del usuario 
                       //no devolver encriptacion de password
                        user.password = undefined;
                        return res.status(200).send({user})
                    }


                    
                }else{
                    return res.status(404).send({message:'El usuaruio no se a podido identificar '});
                }
            });
        }else{
            return res.status(404).send({message:'El usuaruio no se a podido identificar '});
        }
    });
}

//conseguir datos del usuario 
function getUser(req, res){
	var userId = req.params.id;

	User.findById(userId, (err, user) => {
		if(err) return res.status(500).send({message: "Error en la petición."});

		if(!user) return res.status(404).send({message: "El usuario no existe."}); 


		followThisUser(req.user.sub, userId).then((value) => {
			console.log(userId.followed);
			return res.status(200).send({
				user,
				following: value.following,
				followed: value.followed
			}); 
		});
	});
}

//funcion asíncrona y se puede ejecutar en cualquier otro método, devuelve una promesa
async function followThisUser(identity_user_id, user_id){
	//console.log(identity_user_id); 
	//console.log(user_id);

	var following = await Follow.findOne({"user":identity_user_id, "followed":user_id}).exec().then((follow) => {
			return follow; 
		}).catch((err) => {
			return handleError(err);
		});

	var followed = await Follow.findOne({"user":user_id, "followed":identity_user_id}).exec().then((follow) => {
			return follow; 
		}).catch((err) => {
			return handleError(err);
		});

	return {
		following: following,
		followed: followed
	}
}


//Devolver un listado de usuarios paginados
function getUsers(req, res){
	var identity_user_id = req.user.sub; 

	var page= 1;
	if(req.params.page){
		page= req.params.page; 
	}

	var itemsPerPage = 5; 

	User.find().sort('_id').paginate(page, itemsPerPage, (err,users, total) => {
		if(err) return res.status(500).send({message: "Error en la petición."}); 

		if(!users) return res.status(404).send({message: "No hay usuarios disponibles."}); 

		followedUserIds(identity_user_id).then((value) => {

			return res.status(200).send({
				users,
				users_following: value.following,   //Se interpreta que users está dentro de la propiedad users del objeto.
				users_follow_me: value.followed,
				total,
				pages: Math.ceil(total/itemsPerPage)
			});
		});
	});
}

async function followedUserIds(user_id){
	var following = await Follow.find({"user":user_id}).select({'_id':0,'__v':0,'user':0}).exec().then((follows) => {
		var follows_clean = [];

		follows.forEach((follow) =>{
			console.log(follow.followed);
			follows_clean.push(follow.followed); 
		});

		return follows_clean;
	}); 

	var followed = await Follow.find({"followed":user_id}).select({'_id':0,'__v':0,'followed':0}).exec().then((follows) => {
		var follows_clean = [];

		follows.forEach((follow) =>{
			follows_clean.push(follow.user); 
		});

		return follows_clean;
	}); 

	return {
		following: following,
		followed: followed
	}
}


function getCounters(req, res){
	var userId = req.user.sub;
	if(req.params.id){
		userId = req.params.id;
	}

	getCountFollow(userId).then((value) =>{
			return res.status(200).send(value);
		});
}

async function getCountFollow(user_id){
	var following = await Follow.countDocuments({"user":user_id}).exec().then((count) => {
		return count;
	}).catch((err) =>{
		return handleError(err);
	});

	var followed = await Follow.countDocuments({"followed":user_id}).exec().then((count) =>{
		return count;
	}).catch((err) =>{
		return handleError(err);
	});

	var publications = await Publication.countDocuments({"user":user_id}).exec().then((count) => {

		return count; 

		}).catch((err) =>{
			return handleError(err);
	});

	return {
		following: following,
		followed: followed,
		publications: publications
	}
}


//edicion de datos de usuarios 
function updateUser(req, res){
    var userId = req.params.id;
    var update = req.body;

    //borrar la propiedad del password
    delete update.password;

    if(userId != req.user.sub){
        return res.status(500).send({message: 'no tienes permiso para actualizar los datos del usuario'}); 
    }

    User.findByIdAndUpdate(userId, update, {new:true}, (err, userUpdate) => {
        if(err) return res.status(500).send({message: 'Error en la peticion'});

        if(!userUpdate) return res.status(404).send({message: 'No se a podido actualizar el usuario '});

        return res.status(200).send({user: userUpdate});
    });
}

//subir archivos de imagen/avatar de usuario
function uploadImage(req, res){
    var userId = req.params.id;

    if(req.files){
        var file_path = req.files.image.path;
        console.log(file_path);

        var file_split = file_path.split('\\')
        console.log(file_split);

        var file_name = file_split[2];
        console.log(file_name);

        var ext_split = file_name.split('\.');
        console.log(ext_split);

        var file_ext = ext_split[1];
        console.log(file_ext);

        if(userId != req.user.sub){
            return removeFileOfUploads(res, file_path, 'No tiene permiso para actualizar los datos del usuario');
        }

        if(file_ext == 'png' || file_ext == 'jpg' || file_ext == 'jpeg' || file_ext == 'gif'){
            //Actualizar documentos de usuario logrado

            User.findByIdAndUpdate(userId, {image: file_name}, {new:true}, (err, userUpdate) => {

                if(err) return res.status(500).send({message: 'Error en la peticion'});

                if(!userUpdate) return res.status(404).send({message: 'No se a podido actualizar el usuario '});

                return res.status(200).send({user: userUpdate});

            })

        }else{
            return removeFileOfUploads(res, file_path, 'Extension no valida');
        }

    }else{
        return res.status(200).send({message: ' no se a subido la imagen'});
    }
}

function removeFileOfUploads(res, file_path, message){
    fs.unlink(file_path,(err) => {
        return res.status(200).send({message: message});
    });
}


function getImageFile(req, res){
    var image_file = req.params.imageFile;
    var path_file = './uploads/users/'+image_file;

    fs.exists(path_file, (exists) =>{
        if(exists){
            res.sendFile(path.resolve(path_file));
        }else{
            res.status(200).send({message: 'No existe la imagen...'});
        }
    });
}

module.exports = {
    home, 
	pruebas,
	saveUser,
	loginUser, 
	getUser,
	getUsers,
	getCounters,
	updateUser,
	uploadImage,
	getImageFile
}
