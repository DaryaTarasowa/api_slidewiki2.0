var crypto = require('crypto');
var salt = 'slidewikisalt';

// Load required packages
var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');

// Define our user schema
var MuserSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    sql_id: {
        type: Number,
        unique: false,
        required: false
    },
    email: {
        type: String,
        unique: false,
        required: false
    },
    registered: {
        type: Date, default: Date.now
    },
    avatar: {
        type: String,
        unique: false,
        required: false
    },
    description: {
        type: String,
        unique: false,
        required: false
    },
    role: {
        type: [],
        default: []
    }
    
});

// Execute before each user.save() call
MuserSchema.pre('save', function(callback) {
    var user = this;

    // Break out if the password hasn't changed
    if (!user.isModified('password')) return callback();

    // Password changed so we need to hash it
    bcrypt.genSalt(5, function(err, salt) {
        if (err) return callback(err);
        
        var hash_md5 = crypto.createHash('md5').update(user.password + salt).digest('hex');
        bcrypt.hash(hash_md5, salt, null, function(err, hash) {
            if (err) return callback(err);
            user.password = hash;
            callback();
        });
    });
});

MuserSchema.methods.verifyPassword = function(password, callback) {
    var hash = crypto.createHash('md5').update(password + salt).digest('hex');
    bcrypt.compare(hash, this.password, function(err, isMatch) {
        if (err) return callback(err);
        callback(null, isMatch);
    });
};


// Export the Mongoose model
module.exports = mongoose.model('Muser', MuserSchema);

