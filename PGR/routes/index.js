var express = require('express');
var router = express.Router();
var axios = require('axios')
var jwt_decode = require('jwt-decode');
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })
var path = require('path')
var fs = require('fs')
const User = require('../models/user')
const Commons = require('../commons/commons')

/* GET home page. */
router.get('/', function(req, res) {
  if (req.cookies.auth == "1") { res.cookie('auth', {expires: Date.now()}); res.render('index', {err: "1", title: 'PGR' });} 
  else if (req.cookies.auth == "2") { res.cookie('auth', {expires: Date.now()}); res.render('index', {err: "2", title: 'PGR' });} 
  else res.render('index', {err: "0", title: 'PGR' });
});

/* GET feed */
router.get('/feed', function(req, res) {
  res.render('feed', {token: req.cookies.token });
});

/* Página de acesso não autorizado */
router.get('/naoaut', function(req, res) {
  res.render('naoaut', { title: 'PGR' });
});


/* Form de registo */
router.get('/registar', function(req, res) {
  res.render('registar', { title: 'PGR' });
});

/* Perfil de consumidor e produtor */
router.get('/perfil', function(req, res) {
  if(req.cookies.logout == "1") { // verifica se sessão deu logout
    res.cookie('auth', "2", { 
      expires: new Date(Date.now() + '1d'),
      secure: false, // set to true if your using https
      httpOnly: true
     }); 
     res.redirect("/")
  }
  u_id = jwt_decode(req.cookies.token).id // retira email da cookie
  axios.get('http://localhost:7777/users/perfil?email=' + u_id+ "&token=" + req.cookies.token)  
    .then (dados => {
      const testFolder = path.resolve(__dirname, '../') + "/public/profilepics/"

      // -------------------------- Adiciona extensão --------------------------

      var extensao = ""
      fs.readdirSync(testFolder).forEach(file => {
        if(path.parse(file).name == dados.data.data.email){
          extensao = path.parse(file).ext
        }
      });

      // Se não encontrar o ficheiro, quer dizer que o user não tem foto de perfil
      var temFoto = true
      if(extensao == ""){
        temFoto = false
      }

      // -----------------------------------------------------------------------

      change=true
      if(Commons.verifyAdmin(req.cookies.token) == true) res.render("naoaut", { title: 'PGR' })
      var consumidor = Commons.verifyConsumidor(req.cookies.token)
      var produtor = Commons.verifyProdutor(req.cookies.token)
      res.render("perfil", {title: 'PGR',change: change , perfil: dados.data.data, extensao: extensao , isProd: produtor, isCons: consumidor, temFoto: temFoto, id: u_id, token: req.cookies.token})
    })
    .catch(err => res.render('error',{error: err}))
});

/* POST utilizador */
router.post('/registar',upload.single('myFile'), function(req, res) {
  var u = new User(req.body)
  u.dataRegisto = new Date(Date.now()).toISOString()
  u.dataUltimoAcesso = new Date(Date.now()).toISOString()

  if(req.file){

    //------------------------- Upload Profile Pic ----------------------------------

    let oldPath = path.resolve(__dirname, '../') + '/' + req.file.path
    let newPath = path.resolve(__dirname, '../') + '/public/profilepics/' + u.email + path.extname(req.file.originalname)

    fs.rename(oldPath,newPath, function (err){
      if(err) throw err
    })

    // ------------------------------------------------------------------------------
  }

  // regista utilizador
  axios.post('http://localhost:7776/users/registar',u)
    .then(data => console.log("Registado"))
    .catch(err => res.render('error',{error: err}))

  res.redirect("/")
});

/* POST newProfilePic */
router.post('/newProfilePic',upload.single('myFile'), function(req, res) {
  var token = req.cookies.token
  u_email = jwt_decode(token).id
  if(req.file){

    var extensao = ""
    fs.readdirSync(path.resolve(__dirname, '../') + '/public/profilepics/').forEach(file => {
      if(path.parse(file).name == u_email){
        extensao = path.parse(file).ext
      }
    });

    var foto_antiga = path.resolve(__dirname, '../') + '/public/profilepics/' + u_email + extensao
    fs.unlink(foto_antiga, function(){
      console.log("Foto antiga foi apagada.")
    });

    //------------------------- Upload Profile Pic ----------------------------------

    let oldPath = path.resolve(__dirname, '../') + '/' + req.file.path
    let newPath = path.resolve(__dirname, '../') + '/public/profilepics/' + u_email + path.extname(req.file.originalname)

    fs.rename(oldPath,newPath, function (err){
      if(err) throw err
    })

    // ------------------------------------------------------------------------------
  }

  res.redirect("/perfil")
});

/* POST login */
router.post('/login', function(req, res) {
  var email = req.body.email
  var password = req.body.password
  var u = {"email" : email, "password" : password}
  axios.post('http://localhost:7776/users/login', u)
    .then(dados => {
      res.cookie('token', dados.data.token, {
        expires: new Date(Date.now() + '1d'),
        secure: false, // set to true if your using https
        httpOnly: true
      });
      res.cookie('logout', {expires: Date.now()});
      res.cookie('auth', {expires: Date.now()});
      if(Commons.verifyAdmin(dados.data.token) == true) res.redirect("/admin/edit")
      if(Commons.verifyProdutor(dados.data.token) || Commons.verifyConsumidor(dados.data.token)) 
        res.redirect("/perfil")
    })
    .catch( err => {res.cookie('auth', "1", {
      expires: new Date(Date.now() + '1d'),
      secure: false, // set to true if your using https
      httpOnly: true
    }); res.redirect("/")})
});

/* Página de admin ... */
router.get('/admin/edit',function(req,res){
  if(Commons.verifyProdutor(req.cookies.token) == true) res.render("naoaut", { title: 'PGR' })
  if(Commons.verifyConsumidor(req.cookies.token) == true) res.render("naoaut", { title: 'PGR' })
  if(Commons.verifyAdmin(req.cookies.token) == true){
  axios.get('http://localhost:7777/users/lista?token=' + req.cookies.token)
    .then(data => {res.render('edit', {token: req.cookies.token,list: data.data, title: 'PGR'})})
    .catch(err => res.render('error', {error: err}))}
  })

/* Página de admin ... */
router.get('/perfil/:id',function(req,res){
  id = req.params.id
  var num = 0
  if(req.cookies.logout == "1") { // verifica se sessão deu logout
    res.cookie('auth', "2", { 
      expires: new Date(Date.now() + '1d'),
      secure: false, // set to true if your using https
      httpOnly: true
     }); 
     res.redirect("/")
  }
  axios.get('http://localhost:7777/users/perfil?id=' + id + "&token=" + req.cookies.token)  
    .then (dados => {
      const testFolder = path.resolve(__dirname, '../') + "/public/profilepics/"

      // -------------------------- Adiciona extensão --------------------------

      var extensao = ""
      fs.readdirSync(testFolder).forEach(file => {
        if(path.parse(file).name == dados.data.data.email){
          extensao = path.parse(file).ext
        }
      });

      // Se não encontrar o ficheiro, quer dizer que o user não tem foto de perfil
      var temFoto = true
      if(extensao == ""){
        temFoto = false
      }

      // -----------------------------------------------------------------------
      if(dados.data.data.nivel == "produtor"){
        produtor = true
        consumidor = false
        admin = false
        axios.get('http://localhost:7777/recurso/numFich/' + id + "?token=" + req.cookies.token)
        .then(dados => {num = dados})
        .catch(err => res.render('error',{error: err}))
      }
      if(dados.data.data.nivel == "consumidor"){
        produtor = false
        consumidor = true
        admin = false
      }
      if(dados.data.data.nivel == "admin"){
        produtor = false
        consumidor = false
        admin = true
      }
      var email = dados.data.data.email
      if(email == jwt_decode(req.cookies.token).id) change=true
      else change=false
      res.render("perfil" , {title: 'PGR',num: num, igual: change, perfil: dados.data.data, extensao: extensao, isAdmin: admin, isProd: produtor, isCons: consumidor, temFoto: temFoto, id: email, token: req.cookies.token})
      })
      .catch(err => res.render('error',{error: err}))
});

/* POST newProfilePic */
router.post('/newProfilePic',upload.single('myFile'), function(req, res) {
  var token = req.cookies.token
  u_email = jwt_decode(token).id
  if(req.file){

    //------------------------- Upload Profile Pic ----------------------------------

    let oldPath = path.resolve(__dirname, '../') + '/' + req.file.path
    let newPath = path.resolve(__dirname, '../') + '/public/profilepics/' + u_email + path.extname(req.file.originalname)

    fs.rename(oldPath,newPath, function (err){
      if(err) throw err
    })

    // ------------------------------------------------------------------------------
  }

  res.redirect("/perfil")
});


/* Eliminar User */ 
router.get("/admin/delete/:id", (req,res)=>{
  axios.delete('http://localhost:7777/users/remove/' + req.params.id + '?token=' +req.cookies.token)
    .then(data => res.redirect('/admin/edit') )
    .catch(err => res.render('error', {error: err}))
})


/* Logout */
router.get("/logout", function(req,res){
  res.cookie('logout', "1", {
    expires: new Date(Date.now() + '1d'),
    secure: false, // set to true if your using https
    httpOnly: true
  })
  res.cookie('token', {expires: Date.now()});
  res.redirect("/")
})


module.exports = router;
