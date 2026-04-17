const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ReviewSchema = new Schema({
    author: {
        id: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    body: {
        type: String,
        trim: true,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const MovieSchema = new Schema({
    title: String,
    year: Number,
    poster: String,
    image: String,
    type: {
        type: String,
        default: 'Movie'
    },
    library: {
        type: String,
        default: 'Hollywood'
    },
    genre: String,
    director: String,
    cast: [String],
    description: String,
    imdbRating: Number,
    reviews: [ReviewSchema]
});

module.exports = mongoose.model('Movie', MovieSchema);
