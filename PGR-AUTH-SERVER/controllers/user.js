// User controller
var User = require('../models/user')

module.exports.lookup = id => {
    console.log("asdasd")
    return User
        .findOne({email: id})
        .exec()
}
module.exports.inserir = u => {
    var novo = new User(u)
    return novo.save()
}

