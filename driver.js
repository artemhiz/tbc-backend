const model = require('./menu/menu-model');

module.exports.createItem = async (title, description, imgLink, price) => {
    const newItemTitle = await model.BilingualText.create({
        eng: title.eng,
        tr: title.tr,
    })
    let finalObject = { title: newItemTitle._id };

    if (imgLink) {
        finalObject = { ...finalObject, imgLink };
    }

    if (description) {
        const newItemDescription = await model.BilingualText.create({
            eng: description.eng,
            tr: description.tr,
        })
        finalObject = { ...finalObject, description: newItemDescription._id };
    }
    if (price) {
        const newItemPrices = await Promise.all(
            price.map(async p => {
                const priceDoc = await model.Price.create({
                    weight: p.weight,
                    price: p.price,
                })
                return priceDoc._id;
            })
        )
        finalObject = { ...finalObject, price: newItemPrices }
    }

    const newItem = await model.Item.create(finalObject);
    return newItem;
}

module.exports.findSpecialCondition = async (_id) => {
    const specialCondition = await model.SpecialCondition.findOne({ _id });
    return {
        title: await model.BilingualText.findOne({ _id: specialCondition.title }),
        description: await model.BilingualText.findOne({ _id: specialCondition.description }),
    }
}

module.exports.findTitle = async (_id) => {
    const title = await model.BilingualText.findOne({ _id });
    return title;
}

module.exports.findSubcategories = async (ids) => {
    const subcategories = await Promise.all(
        ids.map(async _id => {
            const subcategory = await model.Subcategory.findOne({ _id });
            const title = await model.BilingualText.findOne({ _id: subcategory.title });

            return {
                title: title,
                contents: await this.findContents(subcategory.contents),
            };
            // return subcategory;
        })
    )
    return subcategories;
}

module.exports.findContents = async (ids) => {
    const contents = await Promise.all(
        ids.map(async _id => {
            const menuItem = await model.Item.findOne({ _id });

            const title = await model.BilingualText.findOne({ _id: menuItem.title });
            const description = await model.BilingualText.findOne({ _id: menuItem.description });
            const price = await Promise.all(
                menuItem.price.map(async _id => {
                    return await model.Price.findOne({ _id });
                })
            )
            return { _id, title, description, imgLink: menuItem.imgLink, price };
        })
    )
    return contents;
}

// module.exports.driver = async (req, res) => {
//     try {
//         await model.BilingualText.deleteMany({});
//         await model.SpecialCondition.deleteMany({});
//         await model.Price.deleteMany({});
//         await model.Subcategory.deleteMany({});
//         await model.Item.deleteMany({});
//         await model.Category.deleteMany({});

//         // Creating a category heading
//         const categoryTitle = await model.BilingualText.create({
//             eng: 'Burgers',
//             tr: 'Burgerler',
//         })
//         const SpecialConditionTitle = await model.BilingualText.create({
//             eng: 'add drink and fries for 95₺',
//             tr: '95₺\'ye içecek & patates ekle',
//         })
//         const specialConditionDescription = await model.BilingualText.create({
//             eng: 'ordering any burger, get menu of drink and fries for just 95₺!',
//             tr: 'her burger sipariş ederek 95₺\'ye içecek ve patates menüsünü al!',
//         })
//         const SpecialCondition = await model.SpecialCondition.create({
//             title: SpecialConditionTitle._id,
//             description: specialConditionDescription._id,
//         })

//         // Creating subcategory
//         const subcategoryTitle = await model.BilingualText.create({
//             eng: 'Choose the size for yourself',
//             tr: 'Gramajını kendin belirle',
//         })

//         // Creating dish card and putting it into subcategory
//         const dishTitle = await model.BilingualText.create({
//             eng: '',
//             tr: 'Classic Burger',
//         })
//         const dishDescription = await model.BilingualText.create({
//             eng: 'Beef meat, caramelized onions, pickles, TBC sauce',
//             tr: 'Dana eti, karamelize soğan, turşu, TBC sos',
//         })
//         const dishPrice1 = await model.Price.create({
//             weight: 100,
//             price: 170,
//         })
//         const dishPrice2 = await model.Price.create({
//             weight: 140,
//             price: 210,
//         })
//         const dish = await model.Item.create({
//             title: dishTitle._id,
//             description: dishDescription._id,
//             price: [dishPrice1._id, dishPrice2._id],
//         })

//         // Uniting subcategory
//         const subcategory = await model.Subcategory.create({
//             title: subcategoryTitle._id,
//             contents: [
//                 dish._id,
//             ]
//         })

//         //Uniting category
//         const category = await model.Category.create({
//             title: categoryTitle._id,
//             special_condition: SpecialCondition._id,
//             color: '#CC0000',
//             subcategories: [
//                 subcategory._id,
//             ],
//         })

//         res.status(201).json(category);
//     } catch (error) {
//         res.status(500).json({
//             error: error.message,
//             line: error.lineNumber,
//         })
//     }
// }