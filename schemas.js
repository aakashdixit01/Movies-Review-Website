const Joi = require('joi');

module.exports.movieSchema = Joi.object({
    movie: Joi.object({
        title: Joi.string().required(),
        year: Joi.number().required().min(1888),
        poster: Joi.string().uri().allow('').optional(),
        image: Joi.string().uri().allow('').optional(),
        type: Joi.string().required(),
        library: Joi.string().required(),
        genre: Joi.string().required(),
        director: Joi.string().required(),
        cast: Joi.string().required(),
        description: Joi.string().required(),
        imdbRating: Joi.number().required().min(0).max(10)
    }).required()
});
