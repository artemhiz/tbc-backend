const { Router } = require('express');
const router = Router();
const model = require('./menu/menu-model');
const { findSpecialCondition, findTitle, findSubcategories, createItem, findContents, findContentsForAdmin, findSubcategoriesForAdmin } = require('./driver');

router.get('/', async (req, res) => {
    const everything = await model.Category.find();
    const processedResult = await Promise.all(
        everything.map(async category => {
            let title = await findTitle(category.title);
            let finalObject = { _id: category._id, title, color: category.color };

            if (category.special_condition) {
                const special_condition = await findSpecialCondition(category.special_condition);
                finalObject = { ...finalObject, special_condition };
            }

            if (category.contents.length > 0) {
                const contents = await findContents(category.contents);
                finalObject = { ...finalObject, contents }
            } else if (category.subcategories.length > 0) {
                const subcategories = await findSubcategories(category.subcategories);
                finalObject = { ...finalObject, subcategories }
            }
            return finalObject;
        })
    )
    res.send(processedResult);
})
router.get('/admin', async (req, res) => {
    const everything = await model.Category.find();
    const processedResult = await Promise.all(
        everything.map(async category => {
            let title = await findTitle(category.title);
            let finalObject = { _id: category._id, title, color: category.color };

            if (category.special_condition) {
                const special_condition = await findSpecialCondition(category.special_condition);
                finalObject = { ...finalObject, special_condition };
            }

            if (category.contents.length > 0) {
                const contents = await findContentsForAdmin(category.contents);
                finalObject = { ...finalObject, contents }
            } else if (category.subcategories.length > 0) {
                const subcategories = await findSubcategoriesForAdmin(category.subcategories);
                finalObject = { ...finalObject, subcategories }
            }
            return finalObject;
        })
    )
    res.send(processedResult);
})

router.post('/item', async (req, res) => {
    try {
        const { _id } = req.body;
        const foundItem = await model.Item.findById(_id);

        const itemTitle = await findTitle(foundItem.title);

        let itemToSend = { title: itemTitle, stop_listed: foundItem.stop_listed };

        if (foundItem.imgLink) {
            itemToSend = { ...itemToSend, imgLink: foundItem.imgLink }
        }

        if (foundItem.description) {
            const itemDescription = await findTitle(foundItem.description);
            itemToSend = { ...itemToSend, description: itemDescription };
        } else {
            itemToSend = { ...itemToSend, description: { eng: '', tr: '' } }
        }

        if (foundItem.price) {
            const itemPrice = await Promise.all(
                foundItem.price.map(p => model.Price.findById(p._id))
            )
            itemToSend = { ...itemToSend, price: itemPrice };
        }

        res.status(200).json(itemToSend);
    } catch(error) {
        res.status(500).json(error);
    }
})

router.delete('/:category/delete-item', async (req, res) => {
    try {
        let itemToSend;
        const { category } = req.params;
        if (!category) {
            return res.status(404).json('Category title is not defined');
        }
        const { _id } = req.body;
        if (!_id) {
            return res.status(404).json('Item ID is not defined');
        }
        const foundItem = await model.Item.find(_id);
        if (!foundItem) {
            return res.status(404).json('Item not found');
        }
        const foundItemTitle = await findTitle(foundItem.title);
        itemToSend = { ...itemToSend, title: foundItemTitle };

        if (foundItem.imgLink) {
            itemToSend = { ...itemToSend, imgLink: foundItem.imgLink };
        }

        if (foundItem.description) {
            const itemDescription = await findTitle(foundItem.description);
            itemToSend = { ...itemToSend, description: itemDescription };
        } else {
            itemToSend = { ...itemToSend, description: { eng: '', tr: '' } }
        }

        if (foundItem.price) {
            const itemPrice = await Promise.all(
                foundItem.price.map(p => model.Price.findById(p._id))
            )
            itemToSend = { ...itemToSend, price: itemPrice };
        }

        const foundCategoryTitle = await model.BilingualText.find({ eng: category.split('-').join(' ') });
        if (!foundCategoryTitle) {
            return res.status(404).json('Category title not found');
        }
        const foundCategory = await model.Category.find({ title: foundCategoryTitle._id });
        if (!foundCategory) {
            return res.status(404).json('Category not found');
        }

        if (foundCategory.contents.includes(_id)) {
            const newArray = foundCategory.contents.filter(item => item._id !== _id);
            const updatedCategory = await model.Category.findByIdAndUpdate({ contents: newArray }, { new: true });

            await model.BilingualText.findByIdAndDelete()
        } else {
            return res.status(500).json('Item is not inside assigned category');
        }
    } catch (error) {
        res.status(500).json(error);
    }
})

router.get('/pricing', async (req, res) => {
    try {
        const allItems = await model.Item.find();

        const filteredItems = await Promise.all(allItems.map(async item => {
            const title = await model.BilingualText.findOne({ _id: item.title });
            const price = await Promise.all(
                item.price.map(async p => {
                    return model.Price.findOne({ _id: p })
                })
            )
            return { title, price }
        }))

        res.status(200).json(filteredItems);
    } catch (error) {
        res.status(500).json(error);
    }
})

router.get('/:category', async (req, res) => {
    try {
        const title = await model.BilingualText.findOne({ eng: req.params.category.split('-').join(' ') });
        if (!title) {
            return res.status(404).json({
                error: 'Category name not found',
            })
        }
        const category = await model.Category.findOne({ title: title._id });
        if (!category) {
            return res.status(404).json({
                error: 'Category not found'
            })
        }

        let result = {
            ...category._doc,
            title: await findTitle(category.title),
            subcategories: await findSubcategories(category.subcategories),
            contents: await findContents(category.contents),
        }

        if (category.special_condition) {
            result = { ...result, special_condition: await findSpecialCondition(category.special_condition) };
        }

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({
            error: error.message || 'Internal Server Error',
            line: error.lineNumber,
        })
    }
})

router.post('/new-category', async (req, res) => {
    try {
        const { title, special_condition, color } = req.body;
        let result = { color: color, contents: [], subcategories: [] };

        // Creating new category's title
        const newCategoryTitle = await model.BilingualText.create({
            eng: title.eng,
            tr: title.tr,
        })
        result = { ...result, title: newCategoryTitle._id };

        // Creating new category's special condition
        if (special_condition) {
            const newSpecialConditionTitle = await model.BilingualText.create({
                eng: special_condition.title.eng,
                tr: special_condition.title.tr,
            })
            const newSpecialConditionDescription = await model.BilingualText.create({
                eng: special_condition.description.eng,
                tr: special_condition.description.tr,
            })
            const newSpecialCondition = await model.SpecialCondition.create({
                title: newSpecialConditionTitle._id,
                description: newSpecialConditionDescription._id,
            })
            result = { ...result, special_condition: newSpecialCondition._id };
        }

        // Creating new category
        const newCategory = await model.Category.create(result);

        res.status(200).json(newCategory);
    } catch (error) {
        res.status(500).json(error);
    }
})

router.post('/:category/new-item', async (req, res) => {
    try {
        const body = req.body;
        if (!body.title) {
            res.status(404).json({
                error: 'New item\'s title not found',
            })
        }
        const categoryTitle = await model.BilingualText.findOne({ eng: req.params.category.split('-').join(' ') });
        const category = await model.Category.findOne({ title: categoryTitle._id });

        if (!categoryTitle || !category) {
            return res.status(404).json({
                error: 'Category not found',
            })
        }
        if (category.subcategories.length > 0) {
            return res.status(500).json({
                error: 'Category has subcategories'
            })
        }

        const newItem = await createItem(body);
        category.contents.push(newItem._id);
        await category.save();

        res.status(200).json(newItem);
    } catch (error) {
        res.status(500).json({
            error: error.message,
            line: error.lineNumber,
        })
    }
})

router.post('/:category/new-subcategory', async (req, res) => {
    try {
        const { title } = req.body;

        // Checking up for category's presence
        const categoryTitle = await model.BilingualText.findOne({ eng: req.params.category.split('-').join(' ') });
        if (!categoryTitle) {
            res.status(404).json({
                error: 'Category name not found',
            })
        }

        const category = await model.Category.findOne({ title: categoryTitle._id });
        if (!category) {
            res.status(404).json({
                error: 'Category not found',
            })
        }

        // Creating new title and adding it to a new subcategory
        const newSubcategoryTitle = await model.BilingualText.create({
            eng: title.eng,
            tr: title.tr,
        })
        const newSubcategory = await model.Subcategory.create({
            title: newSubcategoryTitle._id,
            contents: [],
        })
        
        // Pushing new subcategory into category and saving
        category.subcategories.push(newSubcategory._id);
        await category.save();

        res.status(200).json(newSubcategory);
    } catch (error) {
        res.status(500).json({
            error: error.message,
            line: error.lineNumber,
        })
    }
})

router.post('/:category/:subcategory/new-item', async (req, res) => {
    try {
        const body = req.body;

        const categoryTitle = await model.BilingualText.findOne({ eng: req.params.category.split('-').join(' ') });
        if (!categoryTitle) {
            return res.status(404).json({
                error: 'Category name not found',
            })
        }

        const category = await model.Category.findOne({ title: categoryTitle._id });
        if (!category) {
            return res.status(404).json({
                error: 'Category not found',
            })
        }
        if (category.contents.length > 0) {
            return res.status(500).json({
                error: 'Category has no subcategories',
            })
        }

        const subcategoryTitle = await model.BilingualText.findOne({ eng: req.params.subcategory.split('-').join(' ') });
        if (!subcategoryTitle) {
            return res.status(404).json({
                error: 'Subcategory name not found',
            })
        }

        const subcategory = await model.Subcategory.findOne({ title: subcategoryTitle._id });

        if (!subcategory || !category.subcategories.includes(subcategory._id)) {
            return res.status(404).json({
                error: 'Subcategory not found',
            })
        }

        const newItem = await createItem(body);

        subcategory.contents.push(newItem._id);
        await subcategory.save();

        res.status(200).json(newItem);
    } catch (error) {
        res.status(500).json({
            error: error.message || 'Internal Server Error',
            line: error.lineNumber,
        })
    }
})

router.post('/update/bilingual-text', async (req, res) => {
    try {
        const changes = req.body;
        if (!changes) {
            res.status(404).json({
                error: 'Request body not found',
            })
        }
        console.log(changes);

        if (!changes._id && changes.itemId) {
            const addedText = await model.BilingualText.create({
                eng: changes.eng,
                tr: changes.tr,
            })
            await model.Item.findByIdAndUpdate(changes.itemId, { description: addedText._id });

            res.status(200).json(addedText);
        } else {
            const changedText =  await model.BilingualText.findByIdAndUpdate(changes._id, {
                tr: changes.tr,
                eng: changes.eng,
            }, { new: true });
    
            res.status(200).json(changedText);
        }
    } catch (error) {
        res.status(500).json({ error });
    }
})

router.post('/update/img', async (req, res) => {
    try {
        const { _id, imgLink } = req.body;
        if (!_id) {
            return res.status(404).json({
                error: 'ID not found',
            })
        }

        const updatedItem = await model.Item.findByIdAndUpdate(_id, { imgLink }, { new: true });

        res.status(200).json(updatedItem);
    } catch (error) {
        res.status(500).json(error);
    }
})

// router.post('/update/color', async (req, res) => {
//     try {
//         const { _id, color } = req.body;
//         if (!_id) {
//             return res.status(404).json({
//                 error: 'ID not found',
//             });
//         }
//         if (!color) {
//             return res.status(404).json({
//                 error: 'Request body not found',
//             })
//         }

//         const changedCategory = await model.Category.findByIdAndUpdate(_id, { color }, { new: true });
//         if (!changedCategory) {
//             return res.status(404).json({
//                 error: 'Could not update category\'s color',
//             })
//         }

//         res.status(200).json(changedCategory);
//     } catch (error) {
//         res.status(500).json(error);
//     }
// })

router.post('/update/price', async (req, res) => {
    try {
        const { array } = req.body
        if (!array) {
            res.status(404).json({
                error: 'Array of changed prices not found',
            })
        }

        const changedPrices = await Promise.all(
            array.map(async price => {
                const changes = {
                    weight: price.weight,
                    price: price.price,
                }
                const changedPrice = await model.Price.findByIdAndUpdate(price._id, changes, { new: true });
                return changedPrice;
            })
        )
        res.status(200).json(changedPrices);
    } catch (error) {
        res.status(500).json(error);
    }
})

router.post('/stop-list', async (req, res) => {
    try {
        const { _id, stop_listed } = req.body;
        const updatedItem = await model.Item.findByIdAndUpdate(_id, { stop_listed }, { new: true });

        res.status(200).json({
            message: 'Item updated successfully',
            updatedItem,
        })
    } catch (error) {
        console.error(error);
        res.status(500).json(error);
    }
})

router.delete('/:category/delete-item', async (req, res) => {
    try {
        const foundCategoryTitle = await model.BilingualText.findOne({ eng: req.params.category.split('-').join(' ') });
        if (!foundCategoryTitle) {
            return res.status(404).json('Category name not found');
        }
        const foundCategory = await model.Category.findOne({ title: foundCategoryTitle._id });
        if (!foundCategory) {
            return res.status(404).json('Category not found');
        } else if (foundCategory.subcategories.length > 0) {
            return res.status(500).json('There are subcategories in this category, make a different request pointing the subcategory name');
        }

        const { _id } = req.body;
        const foundItem = await model.Item.findById(_id);
        if (!foundItem) {
            return res.status(404).json('Item not found');
        } else if (!foundCategory.contents.includes(_id)) {
            return res.status(404).json('Item not found in this category');
        }

        let newCategoryArray = foundCategory.contents.filter(itemId => itemId !== _id);
        const updatedCategory = await model.Category.findByIdAndUpdate(foundCategory._id, { contents: newCategoryArray }, { new: true });
        if (!updatedCategory) {
            return res.status(500).json('Could not update category\'s contents')
        } else {
            await model.BilingualText.findByIdAndDelete(foundItem.title);
            await model.BilingualText.findByIdAndDelete(foundItem.description);
            await Promise.all(
                foundCategory.price.map(async p => {
                    await model.Price.findByIdAndDelete(p);
                })
            )
            await model.Item.findByIdAndDelete(_id);

            res.status(200).json({
                message: 'Item deleted successfully',
                updatedCategory
            })
        }
    } catch (error) {
        console.error(error.message);
        res.json(error.message);
    }
})

// router.post('/add/description', async (req, res) => {
//     try {
//         const { _id, description } = req.body;
//         if (!_id) {
//             return res.status(500).json('ID of an item is not defined');
//         }
//         if (!description) {
//             return res.status(500).json('Description to add is not defined');
//         }
//         let foundItem = await model.Item.findById(_id);
//         if (!foundItem) {
//             return res.status(500).json('Item with given ID not found');
//         }


//     } catch (error) {
//         res.status(500).json(error);
//     }
// })

module.exports = router;