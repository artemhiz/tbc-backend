const mongoose = require('mongoose');

const bilingualSchema = new mongoose.Schema({
    eng: {
        type: String,
        required: false,
    },
    tr: {
        type: String,
        required: true,
    },
})
module.exports.BilingualText = mongoose.model('BilingualText', bilingualSchema);

const weightPriceShema = new mongoose.Schema({
    weight: {
        type: Number,
        required: false,
    },
    price: {
        type: Number,
        required: true,
    },
})
module.exports.Price = mongoose.model('Price', weightPriceShema);

const menuItemSchema = new mongoose.Schema({
    title: {
        type: mongoose.Types.ObjectId,
        ref: 'BilingualText',
        required: true,
    },
    description: {
        type: mongoose.Types.ObjectId,
        ref: 'BilingualText',
    },
    imgLink: {
        type: String,
    },
    price: {
        type: [mongoose.Types.ObjectId],
        ref: 'Price',
    },
    stop_listed: {
        type: Boolean,
        required: true,
        default: false,
    }
})
module.exports.Item = mongoose.model('Item', menuItemSchema);

const specialConditionSchema = new mongoose.Schema({
    title: {
        type: mongoose.Types.ObjectId,
        ref: 'BilingualText',
        required: true,
    },
    description: {
        type: mongoose.Types.ObjectId,
        ref: 'BilingualText',
    },
})
module.exports.SpecialCondition = mongoose.model('SpecialCondition', specialConditionSchema);

const menuSubcategorySchema = new mongoose.Schema({
    title: {
        type: mongoose.Types.ObjectId,
        ref: 'BilingualText',
        required: true,
    },
    contents: {
        type: [mongoose.Types.ObjectId],
        ref: 'Item',
        required: true,
    },
})
module.exports.Subcategory = mongoose.model('Subcategory', menuSubcategorySchema);

const menuCategorySchema = new mongoose.Schema({
    special_condition: {
        type: mongoose.Types.ObjectId,
        ref: 'SpecialCondition',
    },
    title: {
        type: mongoose.Types.ObjectId,
        ref: 'BilingualText',
        required: true,
    },
    color: {
        type: String,
    },
    contents: {
        type: [mongoose.Types.ObjectId],
        ref: 'Item',
    },
    subcategories: {
        type: [mongoose.Types.ObjectId],
        ref: 'Subcategory',
    },
})
module.exports.Category = mongoose.model('Category', menuCategorySchema);

// const campaignSchema = new mongoose.Schema({
//     title: {
//         type: mongoose.Types.ObjectId,
//         ref: 'BilingualText',
//         required: true,
//     },
//     description: {
//         type: mongoose.Types.ObjectId,
//         ref: 'BilingualText',
//     },
// })
// const Campaign = mongoose.model('Campaign', campaignSchema);

// const totalMenuSchema = new mongoose.Schema({
//     menu: {
//         type: [mongoose.Types.ObjectId],
//         ref: 'Category',
//         required: true,
//     },
// })
// const Menu = mongoose.model('Menu', totalMenuSchema);