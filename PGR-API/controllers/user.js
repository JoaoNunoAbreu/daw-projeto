// User controller
var User = require('../models/user')

// Returns user list
module.exports.list = () => {
    return User
        .find()
        .sort({nome:1})
        .exec()
}

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

module.exports.remove = id => {
    return User
        .deleteOne({email: id})
        .exec()
}
