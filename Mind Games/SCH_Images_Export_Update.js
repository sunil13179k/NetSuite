/**
 ** @client: Mind Games
 ** @author: Sunil
 ** @dated: 06-20-2022 - MM/DD/YYYY
 ** @Script Name: SCH_Images_Export_Update.js
 ** @Description: import the pickup locations for the inventory.
 ** @NApiVersion 2.1
 ** @NScriptType ScheduledScript
 ** @NModuleScope SameAccount
 */
define(['N/https', 'N/record', 'N/runtime', 'N/search', 'N/task', 'N/encode', './LIB_NetScore_WooCommerce_License_Validator'],
    /**
     * @param{https} https
     * @param{record} record
     * @param{runtime} runtime
     * @param{search} search
     * @param{task} task
     */
    (https, record, runtime, search, task, encode, LIB_NetScore_License_Validator) => {

        /**
         * Defines the Scheduled script trigger point.
         * @param {Object} scriptContext
         * @param {string} scriptContext.type - Script execution context. Use values from the scriptContext.InvocationType enum.
         * @since 2015.2
         */
        var SetupRecID, WooID, ItemRecID, ItemRecType, ApiUrl, ConsumerKey, ConsumerSecret, CurrentErrMsg;
        var OldImgIDsArr = [];
        var NewImgIDsArr = [];
        var startTime = Number(new Date().getTime());
        const execute = (scriptContext) => {
            try {
                log.audit({
                    title: 'Images Export/Update Script',
                    details: 'Start'
                });
                var scriptObj = runtime.getCurrentScript();
                SetupRecID = scriptObj.getParameter({
                    name: 'custscript_ns_woo_set_up_rec_id'
                });
                var sp_ImagesSrcId = scriptObj.getParameter({
                    name: 'custscript_ns_woo_images_search'
                });
                log.debug({
                    title: 'Script Parameters',
                    details: 'Setup Record Id: ' + SetupRecID + ' ,SS Id: ' + sp_ImagesSrcId
                });
                var sr_LookupFields = [
                    'custrecord_ns_woo_woocommerce_api_url',
                    'custrecord_ns_woo_consumer_key',
                    'custrecord_ns_woo_consumer_secret',
                    'custrecord_ns_woo_sandbox_account',
                    'custrecord_ns_woo_production_account',
                    'custrecord_ns_woo_product_code',
                    'custrecord_ns_woo_export_images',
                ];
                var setupRecObj = search.lookupFields({
                    type: 'customrecord_woocommerce_connector_setup',
                    id: SetupRecID,
                    columns: sr_LookupFields
                });
                log.audit('Setup Record Lookup Object', setupRecObj);
                var sEnv = setupRecObj.custrecord_ns_woo_sandbox_account;
                var pEnv = setupRecObj.custrecord_ns_woo_production_account;
                var sr_productCode = setupRecObj.custrecord_ns_woo_product_code;
                var exportImages = setupRecObj.custrecord_ns_woo_export_images;
                ApiUrl = setupRecObj.custrecord_ns_woo_woocommerce_api_url;
                ConsumerKey = setupRecObj.custrecord_ns_woo_consumer_key;
                ConsumerSecret = setupRecObj.custrecord_ns_woo_consumer_secret;
                log.debug({
                    title: 'Setup Record Load Block',
                    details: "Product Code: " + sr_productCode
                });
                /* if (!LIB_NetScore_License_Validator.validateLicense(sr_productCode)) {
                    log.audit({
                        title: 'License.',
                        details: "Your license has expired. Please renew your license."
                    });
                    return false;
                } */
                if ((runtime.envType == 'PRODUCTION' && pEnv != true) || (runtime.envType == 'SANDBOX' && sEnv != true)) {
                    log.error('Script Exiting...', 'Script execution environment differs from setup record.');
                    return false;
                } else if (!exportImages) {
                    log.error('Script Exiting...', 'Export Images are Unchecked in the SetUp record');
                    return false;
                }

                if (sp_ImagesSrcId) {
                    var mySearch = search.load({
                        id: sp_ImagesSrcId
                    });
                    var resultSet = mySearch.run();
                    var pagedData = mySearch.runPaged({
                        pageSize: 1000
                    });
                    log.debug('Item Export Script', 'No of results: ' + pagedData.count + ' No of pages: ' + pagedData.pageRanges.length);
                    if (pagedData.pageRanges.length > 0) {
                        for (var i = 0; i < pagedData.pageRanges.length; i++) {
                            var currentPage = pagedData.fetch(i);
                            currentPage.data.forEach(function (result) {
                                OldImgIDsArr = [];
                                NewImgIDsArr = [];
                                CurrentErrMsg = '';
                                ItemRecID = result.id;
                                WooID = result.getValue({
                                    name: 'custitem_woocommerce_item_id'
                                });
                                ItemRecType = result.getValue({
                                    name: resultSet.columns[6]
                                });
                                var getOldImageIdResp = getOldImageId(ApiUrl, WooID, ConsumerKey, ConsumerSecret);
                                if (!getOldImageIdResp) {
                                    //Item Failed. Skip for now.
                                    return true;
                                }
                                var itemImgsArr = [];
                                let imgInd = 1;
                                var itemSKU = result.getValue({
                                    name: 'itemid'
                                });
                                var imgURL1 = result.getValue({
                                    name: 'custitem_woocom_image1'
                                });
                                if (imgURL1) {
                                    let imgName = itemSKU + ' ' + imgInd;
                                    itemImgsArr.push({
                                        name: imgName,
                                        alt: imgName,
                                        src: imgURL1
                                    });
                                    imgInd++;
                                }
                                var imgURL2 = result.getValue({
                                    name: 'custitem_woocom_image2'
                                });
                                if (imgURL2) {
                                    let imgName = itemSKU + ' ' + imgInd;
                                    itemImgsArr.push({
                                        name: imgName,
                                        alt: imgName,
                                        src: imgURL2
                                    });
                                    imgInd++;
                                }
                                var imgURL3 = result.getValue({
                                    name: 'custitem_woocom_image3'
                                });
                                if (imgURL3) {
                                    let imgName = itemSKU + ' ' + imgInd;
                                    itemImgsArr.push({
                                        name: imgName,
                                        alt: imgName,
                                        src: imgURL3
                                    });
                                    imgInd++;
                                }
                                var imgURL4 = result.getValue({
                                    name: 'custitem_woocom_image4'
                                });
                                if (imgURL4) {
                                    let imgName = itemSKU + ' ' + imgInd;
                                    itemImgsArr.push({
                                        name: imgName,
                                        alt: imgName,
                                        src: imgURL4
                                    });
                                    imgInd++;
                                }

                                if (!imgURL1 && !imgURL2 && !imgURL3 && !imgURL4) {
                                    log.audit({
                                        title: 'There is no images',
                                        details: 'Item Id' + ItemRecID + ', Woo Item Id' + WooID
                                    });
                                } else {
                                    var putUrl = ApiUrl + 'products/' + WooID + '?consumer_key=' + ConsumerKey + '&consumer_secret=' + ConsumerSecret;;
                                    var productResponse = updateProductImages(itemImgsArr, putUrl);
                                    if (productResponse) {
                                        settingProductValues(productResponse);
                                        if (OldImgIDsArr) {
                                            if (CurrentErrMsg) {
                                                log.debug(ItemRecID + ': Main: Skipping Old Image Deletion.', 'Error in processing image url.');
                                                return;
                                            }
                                            deleteOldImages(OldImgIDsArr);
                                        }
                                    } else {
                                        //Item Failed. Skip for now.
                                        return true;
                                    }
                                }

                            });
                            var timeExec = Math.floor(timeDiff / 1000 / 60 << 0);
                            var endTime = Number(new Date().getTime());
                            var timeDiff = endTime - startTime;
                            log.audit('Time Difference', 'Start Time: ' + startTime + ' End Time: ' + endTime + ' Time Executed: ' + timeExec);
                            var remainingUsage = scriptObj.getRemainingUsage();
                            log.audit('Remaining Governance', 'Remaining Governance: ' + remainingUsage);
                            if (remainingUsage < 1500 || timeExec > 45) {
                                task.create({
                                    taskType: task.TaskType.SCHEDULED_SCRIPT,
                                    scriptId: runtime.getCurrentScript().id,
                                    deploymentId: runtime.getCurrentScript().deploymentId,
                                }).submit();
                                log.debug('Rescheduled Script', 'Remaining Usage At End Of Sync Item Process: ' + remainingUsage);
                            }
                        }
                    }
                }
            } catch (error) {
                log.error({
                    title: 'Catch Block Error',
                    details: error
                });
                log.error({
                    title: 'Catch Block Error',
                    details: JSON.stringify(error)
                });
            } finally {
                log.audit({
                    title: 'Images Export/Update Script',
                    details: 'End'
                });
            }

        }

        function settingProductValues(productResponse) {
            log.debug(ItemRecID + ': settingProductValues', 'Begins');
            var responseCode = productResponse.code;
            var productBody = productResponse.body;
            log.debug(ItemRecID + ': settingProductValues: API Response', 'Code: ' + responseCode + ', Body: ' + productBody);
            var itemFieldValObj = {};
            itemFieldValObj.custitem_ns_woo_export_images = false;

            if (responseCode === 400) {
                //For handling Vendor image id does not exist scenario only
                let errorBodyObj = JSON.parse(productBody);

                itemFieldValObj.custitem_ns_woo_export_images_err = errorBodyObj;

            } else if (productResponse !== undefined) {
                let errorBodyObj = JSON.parse(productBody);
                let errorMessage = errorBodyObj.message;
                CurrentErrMsg = CurrentErrMsg ? CurrentErrMsg + '\t\n' + errorMessage : errorMessage;
                itemFieldValObj.custitem_ns_woo_export_images_err = CurrentErrMsg;
            }

            log.audit(ItemRecID + ': settingProductValues: Item Fields Obj', JSON.stringify(itemFieldValObj));
            settingNetsuiteValues(itemFieldValObj, ItemRecID);
            log.debug(ItemRecID + ': settingProductValues', 'Ends');
        }

        function updateProductImages(itemImgsArr, putUrl, item_type, itemrecid) {
            log.debug(ItemRecID + ': updateProductImages', 'Begins');
            log.debug(ItemRecID + ': updateProductImages: itemImgsArr', JSON.stringify(itemImgsArr));
            if (item_type) {
                ItemRecType = item_type;
            }
            if (itemrecid) {
                ItemRecID = itemrecid;
            }
            var itemUpdObj = {};
            var action = 'PUT';
            var updateResponse = '';


            //Item Images, Export Image One by One, then set the ids to the product
            for (let singImgInd = 0; singImgInd < itemImgsArr.length; singImgInd++) {
                let imgData = itemImgsArr[singImgInd];
                itemUpdObj.images = [imgData];
                let itemUpdJSON = JSON.stringify(itemUpdObj);
                log.debug(ItemRecID + ': updateProductImages: Single Image Update', 'Item Upd JSON: ' + itemUpdJSON);
                let singleResponse = apiCalls(putUrl, action, itemUpdJSON, '');

                if (!singleResponse) {
                    //If false, mostly time out error. Skip this Item.
                    return false;
                }
                //Call storeImageIds to get the new image id into NewImgIDsArr arr
                storeImageIds(singleResponse, action);
            }

            log.debug(ItemRecID + ': updateProductImages: Complete Images Update', 'Images Arry: ' + JSON.stringify(NewImgIDsArr));
            var completeArry = [];
            for (let index = 0; index < NewImgIDsArr.length; index++) {
                let obj = {};
                obj.id = NewImgIDsArr[index];
                completeArry.push(obj);
            }
            itemUpdObj.images = completeArry;
            let itemUpdJSON = JSON.stringify(itemUpdObj);
            log.debug(ItemRecID + ': updateProductImages: Complete Image Update', 'Item Upd JSON: ' + itemUpdJSON);
            updateResponse = apiCalls(putUrl, action, itemUpdJSON, '');

            log.debug(ItemRecID + ': updateProductImages', 'Ends');
            return updateResponse;
        }

        function getOldImageId(ApiUrl, WooID, ConsumerKey, ConsumerSecret) {
            log.debug(ItemRecID + ': getOldImageId', 'Begins');
            var getUrl = ApiUrl + 'products/' + WooID + '?consumer_key=' + ConsumerKey + '&consumer_secret=' + ConsumerSecret;
            log.debug(ItemRecID + ': getOldImageId: GET URL', getUrl);
            var action = 'GET';
            var getResponse = apiCalls(getUrl, action, '', '');
            if (!getResponse) {
                return false;
            }
            var oldImages = storeImageIds(getResponse, action);
            log.debug(ItemRecID + ': getOldImageId', 'Ends');
            return oldImages;
        }

        function apiCalls(url, action, updateObj, headersObj) {
            if (!headersObj) {
                headersObj = {
                    'Content-Type': 'application/json'
                };
            }
            var response = '';
            try {
                if (action === 'GET') {
                    response = https.get({
                        url: url,
                        headers: headersObj
                    });
                } else if (action === 'PUT') {
                    response = https.put({
                        url: url,
                        body: updateObj,
                        headers: headersObj
                    });
                } else if (action === 'DELETE') {
                    response = https.delete({
                        url: url,
                        headers: headersObj
                    });
                }
            } catch (e) {
                log.error(ItemRecID + ': apiCalls: Api Catch Block', e.name + ', ' + e.message + ', ' + e.stack);
                //log.error(ItemRecID + ': apiCalls: Api Catch Block Error', JSON.stringify(e));
                //Terminate Script so it can retry after sometime
                //throw e;
                return false;
            }
            return response;
        }

        function storeImageIds(getResponse, action) {
            log.debug(ItemRecID + ': storeImageIds', 'Start');
            var responseCode = getResponse.code;
            var productBody = getResponse.body;
            //var productBody = toString(productBody);
            log.debug(ItemRecID + ': storeImageIds: getResponse , Typeof Body' + typeof (productBody), 'Code: ' + responseCode + ', Body: ' + productBody);
            var respBodyObj = JSON.parse(productBody);
            if (responseCode === 200 || responseCode === 201) {
                log.audit(ItemRecID + ': storeImageIds: getResponse', 'Code: ' + responseCode + ', Item Name: ' + respBodyObj.name + ', Images Array: ' + JSON.stringify(respBodyObj.images));
                var imagesArry = respBodyObj.images;
                log.debug(ItemRecID + ': storeImageIds: Images Array', JSON.stringify(imagesArry));
                var imageLength = imagesArry.length;
                if (imageLength > 0) {
                    for (let img = 0; img < imageLength; img++) {
                        let imageID = imagesArry[img].id;
                        let imageName = imagesArry[img].name;
                        if (action === 'GET') {
                            OldImgIDsArr.push({
                                id: imageID,
                                name: imageName
                            });
                            log.debug(ItemRecID + ': storeImageIds: Old Image Data', JSON.stringify(OldImgIDsArr));
                        } else if (action === 'PUT') {
                            NewImgIDsArr.push(imageID);
                            log.debug(ItemRecID + ': storeImageIds: New Image Id', JSON.stringify(NewImgIDsArr));
                        }
                    }
                }
                return true;
            } else if (action === 'PUT') {
                let errorMessage = respBodyObj.message;
                let itemFieldValObj = {};
                itemFieldValObj.custitem_ns_woo_export_images = false;
                CurrentErrMsg = CurrentErrMsg ? CurrentErrMsg + '\t\n' + errorMessage : errorMessage;
                itemFieldValObj.custitem_ns_woo_export_images_err = CurrentErrMsg;
                log.audit(ItemRecID + ': storeImageIds: Item Field Values', JSON.stringify(itemFieldValObj));
                settingNetsuiteValues(itemFieldValObj, ItemRecID);
                log.audit(ItemRecID + ': storeImageIds', 'Ends');
                return false;
            }
        }

        function settingNetsuiteValues(itemFieldValObj, itemID) {
            log.audit(itemID + ': settingNetsuiteValues:: ItemRecType' + ItemRecType, 'Update Obj: ' + JSON.stringify(itemFieldValObj));
            if (ItemRecType === 'InvtPart' || ItemRecType === 'inventoryitem') {
                try {
                    record.submitFields({
                        type: record.Type.INVENTORY_ITEM,
                        id: itemID,
                        values: itemFieldValObj
                    });
                } catch (e) {
                    try {
                        record.submitFields({
                            type: record.Type.SERIALIZED_INVENTORY_ITEM,
                            id: itemID,
                            values: itemFieldValObj
                        });
                    } catch (e) {
                        try {
                            record.submitFields({
                                type: record.Type.LOT_NUMBERED_INVENTORY_ITEM,
                                id: itemID,
                                values: itemFieldValObj
                            });
                        } catch (e) {
                            log.error({
                                title: 'Catch Block: Record Load Error',
                                details: 'Error Name: ' + e.name + ', \nError Details: ' + e.message
                            });
                            log.debug({
                                title: 'Error in loading record',
                                details: 'Error Item Record Id: ' + itemRecId
                            });
                        }
                    }
                }
            } else if (ItemRecType === 'Group') {
                record.submitFields({
                    type: record.Type.ITEM_GROUP,
                    id: itemID,
                    values: itemFieldValObj
                });
            } else if (ItemRecType === 'Kit' || ItemRecType === 'kititem') {
                record.submitFields({
                    type: record.Type.KIT_ITEM,
                    id: itemID,
                    values: itemFieldValObj
                });
            }
            log.audit(itemID + ': settingNetsuiteValues', 'Ends');
            return itemID;
        }

        function deleteOldImages(OldImgIDsArr) {
            log.debug(ItemRecID + ': deleteOldImages: Delete Old Images', 'Start');
            var deleteEndPoint = ApiUrl.split('wc/v3/')[0] + 'wp/v2/media/';
            var stringInput = NSFieldIDs.bsae64Input;
            log.debug(ItemRecID + ': deleteOldImages: String Input', stringInput);
            var base64EncodedString = encode.convert({
                string: stringInput,
                inputEncoding: encode.Encoding.UTF_8,
                outputEncoding: encode.Encoding.BASE_64
            });
            headersObj = {
                'Authorization': 'Basic ' + base64EncodedString
            };
            log.audit(ItemRecID + ': deleteOldImages: Delete End Point', deleteEndPoint);

            OldImgIDsArr.forEach(imgData => {
                //Get Image Name
                let imgID = imgData.id;
                let imgName = imgData.name;
                let delImg = true;

                log.debug(ItemRecID + ': deleteOldImages: This Old Img Data', JSON.stringify(imgData));


                if (delImg) {
                    let thisImgDelEP = deleteEndPoint + imgID + '?force=true';
                    log.audit(ItemRecID + ': deleteOldImages: Vendor Img Delete URL & Headers', 'Url: ' + thisImgDelEP + ' headerObj :' + JSON.stringify(headersObj));
                    let deleteResponce = apiCalls(thisImgDelEP, 'DELETE', '', headersObj);
                    if (deleteResponce.code === 200 || deleteResponce.code === 201) {
                        log.audit(ItemRecID + ': deleteOldImages: Image deleted In WooCommerce', 'Deleted Woo Image Id: ' + imgID);
                    } else {
                        log.audit(ItemRecID + ': deleteOldImages: Image was not delete', 'Woo Image Id: ' + imgID + ', Response Code : ' + deleteResponce.code);
                    }
                }
            });
        }
        return {
            execute
        }

    });