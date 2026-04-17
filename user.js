const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose').default;

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    profilePicture: String,
    gender: {
        type: String,
        default: ''
    },
    age: {
        type: Number,
        min: 0
    },
    favoriteGenres: {
        type: [String],
        default: []
    },
    favoriteTitles: {
        type: [String],
        default: []
    },
    bio: {
        type: String,
        default: ''
    }
});

// This plugin automatically adds a username, hash, and salt field to securely store passwords
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);
