/**
 ** @Client: WooCommerce
 ** @author: Mahesh Bonagiri/ Sunil
 ** @dated: 07-20-2022
 ** @Script Name: LIB_WooCommerce_Item_Export_And_Update.js
 ** @Description: Library script to create/update WooCommerce Products.
 ** @NApiVersion 2.x
 ** @NModuleScope Public
 **/
define(['N/record', 'N/search', 'N/format', 'N/https', 'N/file'],
	function (record, search, format, https, file) {
		var itemRecObj = '';
		var matrixType = '';

		function itemExportproductUpdate(itemRecObj, setupRecObj, item_type, setupRecId, variableId, nsVariationAttr) {
			var itemRecId = itemRecObj.id;
			try {
				{ //Variables Delaration
					log.debug('Lib Begins.', 'Lib Begins.');
					var obj = {};
					var type = '';
					var productTypeValue = '';
					itemRecObj = getItemRecordObj(itemRecId); //Load Item Record.
				} //Variables Delaration
				{ //Conditions......
					{ //Record Types
						log.debug('Product Details', 'Product Type: ' + item_type)
						if (item_type != 'InvtPart' && item_type != 'inventoryitem' && item_type != 'serializedinventoryitem' && (item_type != 'Group' && item_type != 'itemgroup') && (item_type != 'Kit' && item_type != 'kititem')) {
							log.debug({
								title: 'Error',
								details: 'NetSuite Item Type Not Supported'
							});
							return false;
						}
						item_type = itemRecObj.getValue({
							fieldId: 'baserecordtype'
						});
						matrixType = itemRecObj.getValue({
							fieldId: 'matrixtype'
						});
						log.debug({
							title: itemRecId + 'Item Details:',
							details: 'Matrix Value: ' + matrixType
						});
						if (matrixType == 'CHILD') {
							type = 'variation';
							productTypeValue = 5;
						} else if (matrixType == 'PARENT') {
							type = 'variable';
							productTypeValue = 4;
						} else if (item_type == 'Group' || item_type == 'Kit') {
							type = 'grouped';
							productTypeValue = 2;
						} else {
							type = itemRecObj.getText({
								fieldId: 'custitem_woocommerce_product_type'
							});
							productTypeValue = itemRecObj.getValue({
								fieldId: 'custitem_woocommerce_product_type'
							});
							if (!type) {
								type = 'simple';
								productTypeValue = 1;
							}
						}
						obj.type = type;
						log.debug('Product Details', 'Product Type: ' + type);
						if (type == 'external') {
							var externalUrl = itemRecObj.getValue({
								fieldId: 'custitem_woocommerce_external_url'
							});
							log.debug('Product Details', 'External Url: ' + externalUrl);
							obj.external_url = externalUrl;

							var buttonText = itemRecObj.getValue({
								fieldId: 'custitem_woocommerce_button_text'
							});
							log.debug('Product Details', 'Button Text: ' + buttonText);
							obj.button_text = buttonText;
						}
					} //Product Types
					{ //Sku Conditions
						var exportProducts = itemRecObj.getValue({
							fieldId: 'custitem_export_to_woocommerce'
						});
						var updateProducts = itemRecObj.getValue({
							fieldId: 'custitem_woo_upd_woocom_product'
						});
						if (!exportProducts && !updateProducts) {
							var skuError = 'This product is not set for either export or update.';
							return skuError;
						}
						var sku = itemRecObj.getValue({
							fieldId: setupRecObj.custrecord_ns_woo_item_sku_field_id
						});
						if (!sku) {
							var skuError = 'This product has no sku. Please update sku value and try again.';
							return skuError;
						} else {
							log.debug('Product Details', 'SKU: ' + sku);
							obj.sku = sku.toString();
						}
					} //Sku Conditions
					{ //Variable  || Variations Conditons
						var variationExists = false;
						var itemExport = false;
						var productUpdate = false;
						var status = '';
						var statusValue = '';
						var variationId = itemRecObj.getValue({
							fieldId: 'custitem_woocommerce_item_id'
						});
						log.audit({
							title: 'variableId ',
							details: variableId
						});
						if (!variableId)
							variableId = itemRecObj.getValue({
								fieldId: 'custitem_woocom_variable_product_id'
							});
						log.debug({
							title: 'Product Details',
							details: 'Product Id: ' + variableId + ', Variation Id: ' + variationId
						})
						if (matrixType == 'CHILD') {
							status = 'publish';
							statusValue = 4;
							if (variationId && variableId) {
								variationExists = true;
								productUpdate = true;
								itemExport = false;
							} else if (variableId && !variationId) {
								itemExport = true;
								productUpdate = false;
								variationExists = false;
							} else {
								var updateChildError = 'This is Child Product and parent Id Does not exist. This Product will not be exported.';
								return updateChildError;
							}
							log.debug({
								title: 'Variation Product Export',
								details: 'Variation Id: ' + variationId + ', Variable Product Id: ' + variableId
							});
						} else {
							var status = itemRecObj.getText({
								fieldId: 'custitem_woocommerce_product_status'
							}); // 'draft';//
							var statusValue = itemRecObj.getValue({
								fieldId: 'custitem_woocommerce_product_status'
							}); //1	draft, 2	pending, 3	private, 4	publish
							if (status == '' || status == null) {
								status = 'draft';
								statusValue = 1;
							}
							if (variationId) {
								productUpdate = true;
								itemExport = false;
								log.debug({
									title: 'Product Update',
									details: ' Update Product Id: ' + variationId
								});
							} else {
								productUpdate = false;
								itemExport = true;
								log.debug({
									title: 'Item Export',
									details: 'Item Does Not Exists in WooCommerce'
								});
							}
						}
						if (matrixType != 'CHILD') {
							var isonline = itemRecObj.getValue({
								fieldId: 'isonline'
							});
							var HideOnWebSite = itemRecObj.getValue({
								fieldId: 'isonline'
							});
							log.audit({
								title: 'Visable on online',
								details: 'Isonline: ' + isonline + ', status:' + status + ', HideOnWebSite'
							});
							if (!isonline || HideOnWebSite) {
								status = 'draft';
								statusValue = 1;
							}
						}
						if (status)
							obj.status = status;
						log.debug(itemRecId + ': Item Export Script', 'Status: ' + status);
					} //Variable  || Variations Conditons
					{ //Groupd Products Conditions
						if (item_type == 'itemgroup' && type == 'grouped') {
							var membersArry = [];
							var memberCount = itemRecObj.getLineCount({
								sublistId: 'member'
							});
							log.debug({
								title: 'Grouped Product Details',
								details: 'Group Members Count: ' + memberCount
							})
							for (var rowNo = 0; rowNo < memberCount; rowNo++) {
								var groupItemId = itemRecId;
								var groupItemType = item_type;
								var groupItemObj = itemRecObj;

								var memItemId = itemRecObj.getSublistValue({
									sublistId: 'member',
									fieldId: 'item',
									line: rowNo
								});
								var memberItemObj = getItemRecordObj(memItemId); //Load Member ItemRecord
								var memWooId = '';
								var memWooItemType = memberItemObj.getText({
									fieldId: 'custitem_woocommerce_product_type'
								});
								var memItemType = memberItemObj.getValue({
									fieldId: 'baserecordtype'
								});
								if (memWooItemType == 'variation') {
									memWooId = memberItemObj.getValue({
										fieldId: 'custitem_woocom_variable_product_id'
									});
								} else {
									memWooId = memberItemObj.getValue({
										fieldId: 'custitem_woocommerce_item_id'
									});
								}
								log.debug({
									title: 'Grouped Product Details',
									details: 'NS Member Item Id: ' + memItemId + ', NS Member Item Type: ' + memItemType
								})
								log.debug('Member Woo Details', 'Woo Item Id: ' + memWooId + ', Woo Item Type: ' + memWooItemType)
								if (memWooId) {
									membersArry.push(memWooId);
								} else {
									var exportedMemberItemsArry = [];
									exportedMemberItemsArry.push(memItemId);
									var memberItemExport = itemExportproductUpdate(memberItemObj, setupRecObj, memItemType, setupRecId, 0, 0);
									if (!isNaN(memberItemExport)) {
										//record.submitFields({ type: groupItemType , id: groupItemId, values: { 'custitem_woo_exported_member_items':exportedMemberItemsArry } });
										log.debug({
											title: 'Member Item Export Success',
											details: 'Member Item of Id: ' + memItemId + ' exported sucessfully as Variable/Simple of Id: ' + itemExportproductUpdateResponse
										});
										membersArry.push(memberItemExport);
									} else {
										log.debug({
											title: 'Member Item Export Error',
											details: 'Error while exporting Member Item: ' + memberItemExport
										});
										log.debug({
											title: 'Member Item Export Error',
											details: JSON.stringify(memberItemExport)
										});
										//record.submitFields({ type: groupItemType , id: groupItemId, values: { 'custitem_woo_exported_member_items':exportedMemberItemsArry } });
									}
								}
								itemRecId = groupItemId;
								item_type = groupItemType;
								itemRecObj = groupItemObj;
							}
							obj.grouped_products = membersArry;
						}
					} //Groupd Products Conditions
				} //Conditions
				var metaData = [];
				{ //Price & Inventory Details
					if (item_type != 'itemgroup' && type != 'grouped') {
						{ //Get Price Information
							//Regular Price
							var regPriceLvl = '';
							if (setupRecObj.custrecord_ns_woo_reg_price_lvl[0])
								regPriceLvl = setupRecObj.custrecord_ns_woo_reg_price_lvl[0].text;
							if (regPriceLvl) {
								var rpRowNo = itemRecObj.findSublistLineWithValue({
									sublistId: "price1",
									fieldId: 'pricelevelname',
									value: regPriceLvl
								});
								var regularPrice = itemRecObj.getSublistText({
									sublistId: "price1",
									fieldId: 'price_1_',
									line: rpRowNo
								});
								if (regularPrice)
									obj.regular_price = regularPrice.toString();
							}
							//Sale Price
							var salePriceLvl = '';
							var salesPrice = false;
							if (setupRecObj.custrecord_ns_woo_sale_price_lvl[0])
								salePriceLvl = setupRecObj.custrecord_ns_woo_sale_price_lvl[0].text;

							salesPrice = itemRecObj.getValue({
								fieldId: 'custitem_ns_woo_sales_price'
							});
							var updatesale = false;
							var checkPreOrder = false;
							if (salesPrice) {
								var salesStartDate = itemRecObj.getText({
									fieldId: 'custitem_ns_woo_sales_start_date'
								});
								var salesEndDate = itemRecObj.getText({
									fieldId: 'custitem_ns_woo_sales_end_date'
								});
								log.audit({
									title: 'sales price text',
									details: 'Start Date: ' + salesStartDate + ', Sales End Date' + salesEndDate
								});
								if (salesStartDate && salesEndDate) {
									updatesale = checksalesdate(salesStartDate, salesEndDate, checkPreOrder);
									log.audit({
										title: 'Update Sales Price',
										details: 'Update sale :' + updatesale
									});
								}

							}

							if (salePriceLvl && updatesale) {
								var spRowNo = itemRecObj.findSublistLineWithValue({
									sublistId: "price1",
									fieldId: 'pricelevelname',
									value: salePriceLvl
								});
								var salePrice = itemRecObj.getSublistValue({
									sublistId: "price1",
									fieldId: 'price_1_',
									line: spRowNo
								});
								if (salePrice)
									obj.sale_price = salePrice.toString();
							} else {
								obj.sale_price = '';
							}
							log.debug(itemRecId + ': Item Export Script', 'Regular Price: ' + regularPrice + ', Sale Price: ' + salePrice);
						} //Get Price Information
						{ //Get Inventory Details
							var manageStock = itemRecObj.getValue({
								fieldId: 'custitem_woocommerce_manage_stock'
							});
							obj.manage_stock = manageStock;
							if (manageStock == false) {
								var stockStatus = itemRecObj.getText({
									fieldId: 'custitem_woocommerce_stock_status'
								}); // *inhibitor*
								var stockStatusValue = itemRecObj.getValue({
									fieldId: 'custitem_woocommerce_stock_status'
								}); // *inhibitor*
								log.debug(itemRecId + ': Item Export Script', 'Manage Stock: ' + manageStock + ', Stock Status: ' + stockStatus);
								if (stockStatus == 'On backorder')
									stockStatus = 'onbackorder';
								else if (stockStatus == 'Out of stock')
									stockStatus = 'outofstock';
								else {
									stockStatus = 'instock';
									stockStatusValue = 1;
								}
								if (stockStatus)
									obj.stock_status = stockStatus;
							} else {
								var itemLocation = setupRecObj.custrecord_ns_woo_item_location;
								var stockQuantity = 0;
								var preOrder = itemRecObj.getValue({
									fieldId: 'custitem_pre_order_item'
								});
								var preOrderEndDate = itemRecObj.getText({
									fieldId: 'custitem_ns_woo_pre_order_enddate'
								});
								log.debug('Pre Order Details', 'Pre Order: ' + preOrder + ':: Pre Order EndDate: ' + preOrderEndDate);

								var updatePreOrder = false;
								var checkPreOrder = true;
								var preOrderStart = 0;
								if (preOrderEndDate) {
									updatePreOrder = checksalesdate(preOrderStart, preOrderEndDate, checkPreOrder);

								}
								if (!preOrder && !updatePreOrder) {
									var metaPreorder = {
										"key": "_wc_pre_orders_enabled",
										"value": "no"
									};
									metaData.push(metaPreorder);
									if (itemLocation.length > 0) {
										for (var locationIndex = 0; itemLocation && locationIndex < itemLocation.length; locationIndex++) {
											var locRowNo = itemRecObj.findSublistLineWithValue({
												sublistId: 'locations',
												fieldId: 'location_display',
												value: itemLocation[locationIndex].text
											});
											var quantity = Number(itemRecObj.getSublistValue({
												sublistId: 'locations',
												fieldId: 'quantityavailable',
												line: locRowNo
											}));
											stockQuantity += quantity;
										}
									} else {
										//To set the cummulative stock quantity if no location is set in setup record.
										var locationCount = itemRecObj.getLineCount({
											sublistId: 'locations'
										});
										var bufferQantity = 0;
										for (var locRowNo = 0; locRowNo < locationCount; locRowNo++) {
											var stockQty = Number(itemRecObj.getSublistValue({
												sublistId: 'locations',
												fieldId: 'quantityavailable',
												line: locRowNo
											}));
											var buffQty = Number(itemRecObj.getSublistValue({
												sublistId: 'locations',
												fieldId: 'locationstorepickupbufferstock',
												line: locRowNo
											}));
											var locationId = itemRecObj.getSublistValue({
												sublistId: 'locations',
												fieldId: 'locationid',
												line: locRowNo
											});

											var searchObj = search.lookupFields({
												type: record.Type.LOCATION,
												id: locationId,
												columns: ['makeinventoryavailablestore']
											});
											var makeAvailable = searchObj.makeinventoryavailablestore;
											/* var makeAvailable = itemRecObj.getSublistValue({
												sublistId: 'locations',
												fieldId: 'makeinventoryavailablestore',
												line: locRowNo
											}); */
											if (stockQty || buffQty) {
												var locName = itemRecObj.getSublistValue({
													sublistId: 'locations',
													fieldId: 'location_display',
													line: locRowNo
												});
												log.audit({
													title: 'Quantity Datails',
													details: 'Stock Quantity:' + stockQty + ', buffer Qantity:' + buffQty + 'Name:' + locName + 'make available:' + makeAvailable
												});
											}

											if (makeAvailable) {
												var LineQuantity = Number(itemRecObj.getSublistValue({
													sublistId: 'locations',
													fieldId: 'quantityavailable',
													line: locRowNo
												}));
												stockQuantity += LineQuantity;
												if (LineQuantity > 0) {
													bufferQantity += Number(itemRecObj.getSublistValue({
														sublistId: 'locations',
														fieldId: 'locationstorepickupbufferstock',
														line: locRowNo
													}));
												}

											}

										}
										log.audit({
											title: 'Final Quantity Datails',
											details: 'Stock Quantity:' + stockQuantity + ', buffer Qantity:' + bufferQantity
										})
										stockQuantity = stockQuantity - bufferQantity;
									}
								} else { // pre Order
									var metaPreorder = {
										"key": "_wc_pre_orders_enabled",
										"value": "yes"
									}
									metaData.push(metaPreorder);
								}
								if (stockQuantity > 0) {
									obj.stock_quantity = stockQuantity;
								} else {
									obj.stock_quantity = '0';
									if (matrixType != 'CHILD' && !preOrder) {
										status = 'draft';
									}
								}
								var backorders = itemRecObj.getText({
									fieldId: 'custitem_woocommerce_backorders'
								}); //'Do not allow';// *inhibitor*
								var backordersValue = itemRecObj.getValue({
									fieldId: 'custitem_woocommerce_backorders'
								});
								if (backorders == 'Allow')
									backorders = 'yes';
								else if (backorders == 'Allow, but notify customer')
									backorders = 'notify';
								else {
									backorders = 'no';
									backordersValue = 1;
								}
								log.debug('Product Inventory Details', 'Manage Stock: ' + manageStock + ', Quantity: ' + stockQuantity + ', Back Orders: ' + backorders);
								if (backorders)
									obj.backorders = backorders;
							}
						} //Get Inventory Details
					}
				} //Price & Inventory Details
				if (status)
					obj.status = status;
				log.debug(itemRecId + ': Item Export Script', 'Status: ' + status); { //Meta Data Details
					
					var metaPriceObj = {
						"key": "netsuite_internal_id",
						"value": Number(itemRecId)
					};
					metaData.push(metaPriceObj)
					var upccode = itemRecObj.getValue({
						fieldId: 'upccode'
					});
					var metaUPC = {
						"key": "_wpm_gtin_code",
						"value": upccode
					};
					metaData.push(metaUPC)
					obj.meta_data = metaData;
				} //Meta Data Details
				{ //Product General Details
					/* var name = itemRecObj.getValue({
						fieldId: 'custitem_woo_product_name'
					}); */
					var name = itemRecObj.getValue({
						fieldId: 'storedisplayname'
					});
					log.debug(itemRecId + ': Item Export Script', 'Name: ' + name);
					obj.name = name;


					var description = itemRecObj.getValue({
						fieldId: 'storedetaileddescription'
					});
					log.debug(itemRecId + ': Item Export Script', 'Description: ' + description);
					obj.description = description;

					var shortDescription = itemRecObj.getValue({
						fieldId: 'storedescription'
					});
					log.debug(itemRecId + ': Item Export Script', 'Short Description: ' + shortDescription);
					obj.short_description = shortDescription;

					var soldIndividually = itemRecObj.getValue({
						fieldId: 'custitem_woocommerce_sold_individually'
					});
					log.debug(itemRecId + ': Item Export Script', 'Sold Individually: ' + soldIndividually);
					obj.sold_individually = soldIndividually;
					var purchaseNote = itemRecObj.getValue({
						fieldId: 'custitem_woocommerce_purchase_note'
					});
					log.debug(itemRecId + ': Item Export Script', 'Purchase Note: ' + purchaseNote);
					if (purchaseNote)
						obj.purchase_note = purchaseNote;
					var menuOrder = itemRecObj.getValue({
						fieldId: 'custitem_woocommerce_menu_order'
					});
					log.debug(itemRecId + ': Item Export Script', 'Menu Order: ' + menuOrder);
					if (menuOrder)
						obj.menu_order = menuOrder;
					var reviewsAllowed = itemRecObj.getValue({
						fieldId: 'custitem_woocommerce_reviews_allowed'
					});
					log.debug(itemRecId + ': Item Export Script', 'Reviews Allowed: ' + reviewsAllowed);
					if (reviewsAllowed)
						obj.reviews_allowed = reviewsAllowed;
					var featured = itemRecObj.getValue({
						fieldId: 'custitem_woocommerce_featured'
					});
					log.debug(itemRecId + ': Item Export Script', 'Featured: ' + featured);
					if (featured)
						obj.featured = featured;
					var taxStatus = itemRecObj.getText({
						fieldId: 'custitem_woocommerce_tax_status'
					});
					var taxStatusValue = itemRecObj.getValue({
						fieldId: 'custitem_woocommerce_tax_status'
					});
					if (taxStatus == '' || taxStatus == null) {
						taxStatus = 'taxable';
						taxStatusValue = 1;
					}
					if (taxStatus)
						obj.tax_status = taxStatus;
					log.debug(itemRecId + ': Item Export Script', 'Tax Status: ' + taxStatus);
					var taxClass = itemRecObj.getText({
						fieldId: 'custitem_woocommerce_tax_class'
					});
					var taxClassValue = itemRecObj.getValue({
						fieldId: 'custitem_woocommerce_tax_class'
					});
					if (taxClass == '' || taxClass == null) {
						taxClass = 'standard';
						taxClassValue = 1;
					}
					if (taxClass)
						obj.tax_class = taxClass;
					log.debug(itemRecId + ': Item Export Script', 'Tax Class: ' + taxClass);
					var catalogVisibility = itemRecObj.getText({
						fieldId: 'custitem_woo_catalog_visibility'
					});
					var catalogVisibilityValue = itemRecObj.getValue({
						fieldId: 'custitem_woo_catalog_visibility'
					});
					if (catalogVisibility == '' || catalogVisibility == null) {
						catalogVisibility = 'visible';
						catalogVisibilityValue = 1
					}
					obj.catalog_visibility = catalogVisibility;
					log.debug(itemRecId + ': Item Export Script', 'Catalog Visibility: ' + catalogVisibility);
				} //Product General Details
				{ //Shipping Details
					var weight = itemRecObj.getText({
						fieldId: 'custitem_woocommerce_weight'
					});
					log.debug(itemRecId + ': Item Export Script', 'Weight: ' + weight);
					obj.weight = weight;
					var dimObj = {};
					var length = itemRecObj.getText({
						fieldId: 'custitem_woocommerce_length'
					});
					log.debug(itemRecId + ': Item Export Script', 'Length: ' + length);
					dimObj.length = length;
					var width = itemRecObj.getText({
						fieldId: 'custitem_woocommerce_width'
					});
					log.debug(itemRecId + ': Item Export Script', 'Width: ' + width);
					dimObj.width = width;
					var height = itemRecObj.getText({
						fieldId: 'custitem_woocommerce_height'
					});
					log.debug(itemRecId + ': Item Export Script', 'Height: ' + height);
					dimObj.height = height;
					obj.dimensions = dimObj;
				} //Shipping Details
				{ //Categories Details
					var nsCats = itemRecObj.getValue({
						fieldId: 'custitem_woocommerce_category'
					});
					if (!nsCats) {
						nsCats = [];
					}
					log.debug(itemRecId + ': Item Export Script', 'Selected Categories: ' + JSON.stringify(nsCats));
					if (nsCats.length > 0) {
						var fieldsArry = ['categories', 'customrecord_woocommerce_categories', 'custrecord_woo_category_id', 'custrecord_woo_category_setup_rec_id'];
						var catReturnObj = tagCatAttrObj(nsCats, fieldsArry);
						log.debug(itemRecId + ': Category Object', 'Single Category Obj: ' + JSON.stringify(catReturnObj));
						if (catReturnObj) {
							obj.categories = catReturnObj;
							log.debug({
								title: itemRecId + ': categories body',
								details: 'Formated Categoried Obj: ' + JSON.stringify(obj.categories)
							});
						}
					}
				} //Categories Details
				{ //Tags Details
					var nsTags = itemRecObj.getValue({
						fieldId: 'custitem_woocommerce_tags'
					});
					if (!nsTags) {
						nsTags = [];
					}
					log.debug(itemRecId + ': Item Export Script', 'Selected Tags: ' + JSON.stringify(nsTags));
					if (nsTags.length > 0) {
						var fieldsArry = ['tags', 'customrecord_woocommerce_tags', 'custrecord_woo_tag_id', 'custrecord_woo_tags_setup_rec_id'];
						var tagReturnObj = tagCatAttrObj(nsTags, fieldsArry);
						log.debug(itemRecId + ': Tags Object', 'Single Tags Obj: ' + JSON.stringify(tagReturnObj));
						if (tagReturnObj) {
							obj.tags = tagReturnObj;
							log.debug({
								title: itemRecId + ': tags body',
								details: 'Formated Tags Obj: ' + JSON.stringify(obj.tags)
							});
						}
					}
				} //Tags Details
				{ //attributes Details
					if (nsVariationAttr) {
						obj.attributes = nsVariationAttr;
						log.debug({
							title: itemRecId + ': Attributes',
							details: 'Existing attributes: ' + JSON.stringify(nsVariationAttr)
						});
					} else {
						var nsAttArray = itemRecObj.getValue({
							fieldId: 'custitem_woocommerce_attributes'
						});
						if (!nsAttArray) {
							nsAttArray = [];
						}
						log.debug({
							title: itemRecId + ': Attributes',
							details: 'Formated Attributes Obj: ' + JSON.stringify(nsAttArray)
						});
						var nsTermsArray = itemRecObj.getValue({
							fieldId: 'custitem_ns_woo_attribute_terms'
						});
						if (!nsAttArray) {
							nsAttArray = [];
						}
						if (!nsTermsArray) {
							nsTermsArray = [];
						}
						log.debug({
							title: itemRecId + ': Attributes',
							details: 'Formated Terms Obj: ' + JSON.stringify(nsTermsArray)
						});
						log.debug({
							title: itemRecId + ': Attributes',
							details: 'Formated Attributes Obj: ' + JSON.stringify(nsAttArray)
						});
						if (nsAttArray.length > 0) {
							var finalArray = [];
							var nsAttrObj = {};
							for (var attrId in nsAttArray) {
								nsAttrObj[nsAttArray[attrId]] = [];
								for (var termId in nsTermsArray) {
									var termsObj = search.lookupFields({
										type: 'customrecord_woocommerce_attribute_terms',
										id: nsTermsArray[termId],
										columns: ['custrecord_woo_terms_attribute_name', 'name']
									});
									log.debug({
										title: itemRecId + ': Attributes',
										details: nsAttArray[attrId]
									});
									log.debug({
										title: itemRecId + ': Attributes',
										details: termsObj
									});
									if (nsAttArray[attrId] == termsObj.custrecord_woo_terms_attribute_name[0].value) {
										nsAttrObj[nsAttArray[attrId]].push(termsObj.name)
									}
								}
							}
							var fieldsArry = ['attributes', 'customrecord_woocommerce_attributes', 'custrecord_woo_attribute_id', 'custrecord_woo_attributes_setup_rec_id'];
							log.debug({
								title: itemRecId + ': nsAttrObj',
								details: 'Formated attributes Obj: ' + JSON.stringify(nsAttrObj)
							});
							var keys = Object.keys(nsAttrObj)
							for (var attrkey in keys) {
								finalArray.push(attributeObject(itemRecObj, keys[attrkey], setupRecId, nsAttrObj[keys[attrkey]]))
							}
							log.debug(itemRecId + ': attributes Object', 'Single attributes Obj: ' + JSON.stringify(finalArray));
							if (finalArray.length > 0) {
								obj.attributes = finalArray;
								log.debug({
									title: itemRecId + ': attributes body',
									details: 'Formated attributes Obj: ' + JSON.stringify(obj.attributes)
								});
							}
						}
					}
				} //Attributes Details
				{ //Images Details
					/* var sr_ImageExport = setupRecObj.custrecord_ns_woo_export_images;
					var imageUpload = itemRecObj.getValue({
						fieldId: 'custitem_ns_woo_export_images'
					});
					log.debug(itemRecId + ': Item Export Script', 'Image Upload Check Box: ' + imageUpload);
					if (imageUpload == true && sr_ImageExport) {
						var imageUrls = [];
						var img1 = itemRecObj.getValue({
							fieldId: 'custitem_woocom_image1'
						});
						var img2 = itemRecObj.getValue({
							fieldId: 'custitem_woocom_image2'
						});
						var img3 = itemRecObj.getValue({
							fieldId: 'custitem_woocom_image3'
						});
						var img4 = itemRecObj.getValue({
							fieldId: 'custitem_woocom_image4'
						});
						if (img1)
							imageUrls.push(img1);
						if (img2)
							imageUrls.push(img2);
						if (img3)
							imageUrls.push(img3);
						if (img4)
							imageUrls.push(img4);
						log.debug(itemRecId + ': Item Export Script', 'Image URLs: ' + JSON.stringify(imageUrls));
						//Images
						if (imageUrls.length > 0) {
							if (matrixType == 'CHILD') {
								obj.image = uploadImgToWP([imageUrls[0]], setupRecId, null)[0];
							} else {
								obj.images = uploadImgToWP(imageUrls, setupRecId, null);
							}
						} else {
							log.debug('Product Image Details', 'There are not images for this product.')
						}
					} else {
						log.audit(itemRecId + ': Item Export Script', 'Update Image Check Box Is Unchecked in the Item Record Or Setup record.');
					} */
				} //Images Details
				{ //Up Sells Details
					var upSellsArry = itemRecObj.getValue({
						fieldId: 'custitem_woo_upsells'
					});
					log.debug('Product Up-Sells Details', 'Up-sells Record Ids: ' + upSellsArry);
					if (upSellsArry.length > 0) {
						if (upSellsArry.length > 0) {
							var wooUpsellsArray = [];
							for (var upsellsIndex = 0; upsellsIndex < upSellsArry.length; upsellsIndex++) {
								var upsellsRecObj = getItemRecordObj(upSellsArry[upsellsIndex]);
								var upsellsItemWooType = upsellsRecObj.getText({
									fieldId: 'custitem_woocommerce_product_type'
								});
								var upsellsItemWooId = '';
								if (upsellsItemWooType == 'variation')
									upsellsItemWooId = upsellsRecObj.getValue({
										fieldId: 'custitem_woocom_variable_product_id'
									});
								else
									upsellsItemWooId = upsellsRecObj.getValue({
										fieldId: 'custitem_woocommerce_item_id'
									});
								if (upsellsItemWooId) {
									wooUpsellsArray.push(upsellsItemWooId)
								}
							}
							log.debug('Product Up-Sells Ids', JSON.stringify(wooUpsellsArray));
							obj.upsell_ids = wooUpsellsArray;
						}
					}
				} //Up Sells Details
				{ //Cross Sells Details.
					var crossSellsArry = itemRecObj.getValue({
						fieldId: 'custitem_woo_cross_sells'
					});
					log.debug('Product Cross-Sells Details', 'Cross-sells Record Ids: ' + crossSellsArry);
					if (crossSellsArry.length > 0) {
						if (crossSellsArry.length > 0) {
							var wooCrosssellsArray = [];
							for (var crosssellsIndex = 0; crosssellsIndex < crossSellsArry.length; crosssellsIndex++) {
								var crosssellsRecObj = getItemRecordObj(crossSellsArry[crosssellsIndex]);
								var crosssellsItemWooType = crosssellsRecObj.getText({
									fieldId: 'custitem_woocommerce_product_type'
								});
								var crosssellsItemWooId = '';
								if (crosssellsItemWooType == 'variation')
									crosssellsItemWooId = crosssellsRecObj.getValue({
										fieldId: 'custitem_woocom_variable_product_id'
									});
								else
									crosssellsItemWooId = crosssellsRecObj.getValue({
										fieldId: 'custitem_woocommerce_item_id'
									});
								if (crosssellsItemWooId) {
									wooCrosssellsArray.push(crosssellsItemWooId)
								}
							}
							log.debug('Product Cross-Sells Ids', JSON.stringify(wooCrosssellsArray));
							obj.cross_sell_ids = wooCrosssellsArray;
						}
					}
				} //Cross Sells Details.
				{ //API Request Code
					var productObj = JSON.stringify(obj);
					log.debug('API Request', 'Product Body: ' + productObj);
					var putUrl = '';
					var postUrl = '';
					var response = ''
					var apiUrl = setupRecObj.custrecord_ns_woo_woocommerce_api_url;
					var consumerKey = setupRecObj.custrecord_ns_woo_consumer_key;
					var consumerSecret = setupRecObj.custrecord_ns_woo_consumer_secret;
					if (matrixType == 'CHILD') {
						if (variationExists && productUpdate) { //for updating variable products
							putUrl = apiUrl + 'products/' + variableId + '/variations/' + variationId + '?consumer_key=' + consumerKey + '&consumer_secret=' + consumerSecret; // '';// *inhibitor*
							log.debug('API Request', 'Update Variation Put Url: ' + putUrl);
							response = serverRequest('put', putUrl, productObj);
						} else if (!variationExists && itemExport) { //for creating variations
							postUrl = apiUrl + 'products/' + variableId + '/variations?consumer_key=' + consumerKey + '&consumer_secret=' + consumerSecret; // '';// *inhibitor*
							log.debug('API Request', 'Create Variation Post URL: ' + postUrl);
							response = serverRequest('post', postUrl, productObj);
						}
					} else {
						if (itemExport) { //for create non variation products
							postUrl = apiUrl + 'products?consumer_key=' + consumerKey + '&consumer_secret=' + consumerSecret; // '';// *inhibitor*
							log.debug('API Request', 'Create Non-Variation Post URL: ' + postUrl);
							response = serverRequest('post', postUrl, productObj);
						} else if (productUpdate) {
							putUrl = apiUrl + 'products/' + variationId + '?consumer_key=' + consumerKey + '&consumer_secret=' + consumerSecret; // '';// *inhibitor*
							log.debug('API Request', 'Update Non-Variation Put Url: ' + putUrl);
							response = serverRequest('put', putUrl, productObj);
						}
					}
				} //API Request Code
				{ //API Respose code
					if (typeof (response) == 'object') {
						var responseCode = response.code;
						if (Number(responseCode) == 200 || Number(responseCode) == 201) {
							log.debug('API Response', 'Response Code: ' + responseCode);
							var responseBody = JSON.parse(response.body);
							var wooItemId = responseBody.id;
							log.debug('API Response', 'Response Body: ' + response.body);
							log.debug('API Response', 'WooCommerce Item ID: ' + wooItemId);
							var childRecValues = {};
							childRecValues.custitem_woo_upd_woocom_product = false;
							childRecValues.custitem_export_to_woocommerce = false;
							childRecValues.custitem_ns_woo_images_export = false;
							childRecValues.custitem_ns_woo_item_error_message = '';
							if (matrixType == 'CHILD') {
								if (itemExport) {
									childRecValues.custitem_woocommerce_item_id = wooItemId;
									childRecValues.custitem_woocom_variable_product_id = variableId;
									childRecValues.custitem_woocommerce_product_type = 5;
									childRecValues.custitem_woocom_is_item_a_variation = true;
									childRecValues.custitem_woocommerce_product_status = statusValue;
									childRecValues.custitem_woocommerce_tax_status = taxStatusValue;
									childRecValues.custitem_woocommerce_tax_class = taxClassValue;
									childRecValues.custitem_woocommerce_manage_stock = manageStock;
									childRecValues.custitem_woocommerce_stock_status = stockStatusValue;
									childRecValues.custitem_woocommerce_backorders = backordersValue;
									childRecValues.custitem_woo_catalog_visibility = catalogVisibilityValue;
									childRecValues.custitem_woocommerce_reviews_allowed = reviewsAllowed;
								}
								var parentRecordId = record.submitFields({
									type: item_type,
									id: itemRecId,
									values: childRecValues
								});
								log.debug('Update Child Product Values', 'NS Item Record ID: ' + parentRecordId + ' Variable Id: ' + variableId + ' Variation Id: ' + wooItemId);
							} else {
								if (itemExport) {
									childRecValues.custitem_woocommerce_item_id = wooItemId;
									childRecValues.custitem_woocommerce_product_status = statusValue;
									childRecValues.custitem_woocommerce_product_type = productTypeValue;
								}
								var parentRecordId = record.submitFields({
									type: item_type,
									id: itemRecId,
									values: childRecValues
								});
								log.debug('Non-Variation Product Details', 'NS Item Record ID: ' + parentRecordId + ' Woo Item Id: ' + wooItemId);
								if (matrixType == 'PARENT') {
									var nsAttrArray = obj.attributes;
									var matrixLineCount = itemRecObj.getLineCount({
										sublistId: 'matrixmach'
									});
									log.debug({
										title: 'Variation Primary Data',
										details: 'Matrix Line Count: ' + matrixLineCount
									});
									var itemRecObj1 = itemRecObj;
									for (var rowNo = 0; rowNo < matrixLineCount; rowNo++) {
										var nsVariationAttr = [];
										var lineItemId = itemRecObj1.getSublistValue({
											sublistId: 'matrixmach',
											fieldId: 'mtrxid',
											line: rowNo
										});
										log.debug({
											title: 'Variation Primary Data',
											details: 'Woo Attribute Array: ' + JSON.stringify(nsAttrArray)
										});
										for (var j = 1; j <= nsAttrArray.length; j++) { //Attributes length
											var lineItemTerm = itemRecObj1.getSublistValue({
												sublistId: 'matrixmach',
												fieldId: 'mtrxoption' + j,
												line: rowNo
											});
											log.debug({
												title: 'Variation Primary Data',
												details: 'Line item Id: ' + lineItemId + ', Term Name: ' + lineItemTerm
											});
											if (lineItemTerm) {
												for (var k in nsAttrArray) {
													log.debug({
														title: 'Variation Primary Data',
														details: 'Woo Attribute Array[' + k + '] : ' + JSON.stringify(nsAttrArray[k])
													});
													if (nsAttrArray[k].options) {
														if ((nsAttrArray[k].options).indexOf(lineItemTerm) >= 0) {
															var variationAttrObj = {};
															variationAttrObj.id = nsAttrArray[k].id;
															variationAttrObj.option = lineItemTerm;
															nsVariationAttr.push(variationAttrObj);
															break;
														} //if((nsAttrArray[k].options).indexOf(lineItemTerm) >= 0)
													}
												} //for(var k in wooAttrArray)
											}
										} //for(var j in attrCount)
										log.debug({
											title: 'Variation Primary Data',
											details: 'Line Item Attributes: ' + JSON.stringify(nsVariationAttr)
										});
										//itemRecId = lineItemId;
										var varItemRecObj = getItemRecordObj(lineItemId);
										log.debug({
											title: 'Variation Primary Data',
											details: 'Line Item Variable ID: ' + wooItemId
										});
										//Call productUpdate function to create variation itemExportproductUpdate(itemRecObj,setupRecObj,item_type, setupRecId, variableId, nsVariationAttr)
										var itemExportproductUpdateResponse = itemExportproductUpdate(varItemRecObj, setupRecObj, 'InvtPart', setupRecId, wooItemId, nsVariationAttr);
										if (!isNaN(itemExportproductUpdateResponse)) {
											log.debug({
												title: 'Variation Update Success',
												details: 'Child-Matrix of Id: ' + lineItemId + 'of Variation Id: ' + itemExportproductUpdateResponse + ' updated sucessfully'
											});
										} else {
											log.debug({
												title: 'Variation Update Error',
												details: 'Error while updating child-matrix: ' + lineItemId
											});
											log.debug({
												title: 'Variation Update Error',
												details: itemExportproductUpdateResponse
											});
											record.submitFields({
												type: item_type,
												id: itemRecId,
												values: {
													'custitem_ns_woo_item_error_message': itemExportproductUpdateResponse
												}
											});
										}
									} //for(var line in matrixLineCount)
								} //if(matrixType == 'PARENT') // type == 'variable'
							}
							return wooItemId;
						} else {
							log.debug({
								title: 'API Error Response',
								details: 'Error in API Response. Response Code: ' + responseCode
							});
							var responseBody = JSON.parse(response.body);
							//log.debug({ title: 'API Error Response', details: 'Response Body: ' + response.body });
							var responseError = 'Response Error: Code: ' + responseBody.code + ', Message: ' + responseBody.message + ', Status: ' + responseBody.data.status;
							record.submitFields({
								type: item_type,
								id: itemRecId,
								values: {
									'custitem_ns_woo_item_error_message': responseError
								}
							});
							log.debug({
								title: 'API Error Response',
								details: responseError
							});
							return responseError;
						}
					} else {
						log.debug({
							title: 'API Request Error',
							details: response
						});
						record.submitFields({
							type: item_type,
							id: itemRecId,
							values: {
								'custitem_ns_woo_item_error_message': response
							}
						});
						return response;
					}
				} //API Respose code
			} catch (e) {
				log.error({
					title: itemRecId + ' Catch Block: Error',
					details: 'Error Name: ' + e.name + ',\nError Message: ' + e.message
				});
				log.error({
					title: wooItemId + 'Catch Block: Error: RAW',
					details: JSON.stringify(e)
				});
				record.submitFields({
					type: item_type,
					id: itemRecId,
					values: {
						'custitem_ns_woo_item_error_message': 'Error Name: ' + e.name + ',\nError Message: ' + e.message
					}
				});
				return JSON.stringify(e);
			} finally {
				log.debug('Lib Ends.', 'Lib Ends.');
			}
		}

		function checksalesdate(salesStartDate, salesEndDate, checkPreOrder) {
			var retunvailue = false;
			log.audit({
				title: "check Sales date Function",
				details: "Start"
			});
			var date = new Date();
			var cDate = date.getDate();
			var cMonth = date.getMonth() + 1;
			var cYear = date.getFullYear();
			log.audit({
				title: "Current Date",
				details: "Date: " + cDate + ", Month: " + cMonth + ", Year: " + cYear
			});
			var endDateArry = salesEndDate.split('/');
			var eDay = endDateArry[1];
			var eMonth = endDateArry[0];
			var eYear = endDateArry[2];
			log.audit({
				title: "End Date",
				details: "Date: " + eDay + ", Month: " + eMonth + ", Year: " + eYear
			});
			if (checkPreOrder) {
				if (eYear > cYear) {
					retunvailue = true;
				} else if (eYear == cYear) {
					if (eMonth > cMonth) {
						retunvailue = true;
					} else if (eMonth == cMonth) {
						if (eDay > cDate) {
							retunvailue = true;
						}
					}
				}
			} else {
				var startDateArry = salesStartDate.split('/');
				var sDay = startDateArry[1];
				var sMonth = startDateArry[0];
				var sYear = startDateArry[2];
				log.audit({
					title: "Start Date",
					details: "Date: " + sDay + ", Month: " + sMonth + ", Year: " + sYear
				});
				if (cYear >= sYear && cYear <= eYear) {
					if (eYear > cYear) {
						retunvailue = true;
					} else if (cMonth >= sMonth && cMonth <= eMonth) {
						if (eMonth > cMonth) {
							retunvailue = true;
						} else if (cDate >= sDay && cDate <= eDay) {
							retunvailue = true;
						}
					}
				}
				log.audit({
					title: "check Sales date Function",
					details: "return Value: " + retunvailue
				});

			}


			return retunvailue;

		}

		function serverRequest(requestType, requestUrl, productObj) {
			var callLimit = 4,
				callSuccess = false;
			do {
				callLimit--;
				var response = '';
				log.debug({
					title: 'API Request',
					details: 'Call Limit Left: ' + callLimit
				});
				try {
					//return false;
					var header = [];
					header['Content-Type'] = 'application/json';
					if (requestType == 'post') {
						response = https.post({
							url: requestUrl,
							body: productObj,
							headers: header
						}); // '';// *inhibitor*
						log.debug('API Request', 'API Post Response Type: ' + JSON.stringify(response));
					} else {
						response = https.put({
							url: requestUrl,
							body: productObj,
							headers: header
						}); // '';//*inhibitor*
						log.debug('API Request', 'API Post Response Type: ' + JSON.stringify(response));
					}
					return response;
					callSuccess = true; //This value will not be set if error is thrown at https.post as it jumps right away to catch
				} catch (e) {
					log.error('ServerRequest Catch Block: API Request', JSON.stringify(e));
					if (callLimit == 0) {
						response = 'Error in making post/put call. Error name: ' + e.name + '. Error message: ' + e.message;
						return response
					}
				}
			} while (callLimit > 0 && !callSuccess);
		}

		function tagCatAttrObj(nsRecArray, fieldsArry) {
			var listLength = '';
			if (fieldsArry[0] == 'attributes') {
				listLength = Object.keys(nsRecArray).length;
			} else {
				listLength = nsRecArray.length
			}
			if (listLength > 0) {
				var wooRecArray = [];
				var attrObj = nsRecArray;
				if (fieldsArry[0] == 'attributes') {
					nsRecArray = Object.keys(nsRecArray);
				}
				for (var recIndex in nsRecArray) {
					var filtersArry = [
						['internalid', 'is', Number(nsRecArray[recIndex])]
					];
					var columnsArry = [search.createColumn({
						name: fieldsArry[2]
					}), search.createColumn({
						name: 'name'
					}), search.createColumn({
						name: fieldsArry[3]
					})];
					var tagSearchObj = search.create({
						type: fieldsArry[1],
						filters: filtersArry,
						columns: columnsArry
					});
					var pagedData = tagSearchObj.runPaged({
						pageSize: 1
					}); //perpage 1 result.
					//log.debug( fieldsArry[0]+' Search', fieldsArry[0]+' Search First Result: ' + JSON.stringify(tagSearchResult) );
					if (pagedData.count) {
						var currentPage = pagedData.fetch(0);
						var tagSearchResult = currentPage.data[0];
						var wooRecId = tagSearchResult.getValue({
							name: fieldsArry[2]
						});
						log.debug(fieldsArry[0] + ' Search Result', 'Woo ' + fieldsArry[0] + ' Id: ' + wooRecId)
						var tagObj = {};
						tagObj.id = Number(wooRecId);
						if (fieldsArry[0] == 'attributes') {
							tagObj.position = 0;
							tagObj.visible = true;
							tagObj.variaiton = false;
							tagObj.options = attrObj[nsRecArray[recIndex]];
						}
						wooRecArray.push(tagObj);
					} else {
						log.debug(fieldsArry[0] + ' result', 'The ' + fieldsArry[0] + ' Records not Found');
					}
				}
			} else {
				log.debug(fieldsArry[0] + ' array', 'The Count of an array is empty')
				return false;
			}
			return wooRecArray;
		}

		function uploadImgToWP(itemImagesList, setupRecId, itemImagesIds) {
			var updateImgArry = [];
			for (var imageIndex = 0; imageIndex < itemImagesList.length; imageIndex++) {
				var imageObj = {};
				var imageName = itemImagesList[imageIndex];
				if (imageName) {
					var imagSearch = search.create({
						type: "customrecord_ns_woo_export_image_ids_rec",
						filters: [
							["name", "is", imageName],
							"AND",
							["custrecord_ns_woo_image_setup_rec_id", "anyof", setupRecId]
						],
						columns: [
							search.createColumn({
								name: "name",
								label: "Name"
							}),
							search.createColumn({
								name: "custrecord_ns_woo_image_id",
								label: "WooCommerce Image Id"
							})
						]
					});
					var imgResultSet = imagSearch.run();
					var firstImgResult = imgResultSet.getRange({
						start: 0,
						end: 1
					})[0];
					if (firstImgResult) {
						var imgId = firstImgResult.getValue({
							name: "custrecord_ns_woo_image_id"
						});
						log.debug('Product Image Properties', 'Image Id: ' + imgId);
						if (imgId) {
							imageObj.id = imgId;
							updateImgArry.push(imageObj);
						} else {
							if (itemImagesIds) {
								log.debug('Product Image Properties', 'Image record Found image id updated to : ' + itemImagesIds[imageIndex]);
								record.submitFields({
									type: 'customrecord_ns_woo_export_image_ids_rec',
									id: firstImgResult.id,
									values: {
										'custrecord_ns_woo_image_id': itemImagesIds[imageIndex]
									}
								});
							} else {
								imageObj.src = imageName;
								updateImgArry.push(imageObj);
							}
						}
					} else {
						imageObj.src = imageName;
						updateImgArry.push(imageObj);
						var imgRecObj = record.create({
							type: "customrecord_ns_woo_export_image_ids_rec",
							isDynamic: true
						});
						imgRecObj.setValue({
							fieldId: 'name',
							value: imageName
						});
						imgRecObj.setValue({
							fieldId: 'custrecord_ns_woo_image_setup_rec_id',
							value: setupRecId
						});
						var imgRecId = imgRecObj.save({
							enableSourcing: false,
							ignoreMandatoryFields: true
						});
						log.debug('Product Image Properties', 'Image Record Has been created with Id: ' + imgRecId);
					} //else//if(firstImgResult)
				} else {
					return updateImgArry;
				}
			} //for( var imageIndex = 0; itemImagesList.length > imageIndex; imageIndex++ )
			return updateImgArry;
		}

		function getItemRecordObj(itemRecId) {
			try {
				itemRecObj = record.load({
					type: record.Type.INVENTORY_ITEM,
					id: itemRecId
				});
			} catch (e) {
				try {
					itemRecObj = record.load({
						type: record.Type.SERIALIZED_INVENTORY_ITEM,
						id: itemRecId
					});
				} catch (e) {
					try {
						itemRecObj = record.load({
							type: record.Type.LOT_NUMBERED_INVENTORY_ITEM,
							id: itemRecId
						});
					} catch (e) {
						try {
							itemRecObj = record.load({
								type: record.Type.ITEM_GROUP,
								id: itemRecId
							});
						} catch (e) {
							try {
								itemRecObj = record.load({
									type: record.Type.KIT_ITEM,
									id: itemRecId
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
								return false;
							}
						}
					}
				}
			}
			return itemRecObj;
		}

		function attributeObject(itemRecObj, attributeId, setupRecId, terms) {
			var formattedObj = {};
			if (matrixType == 'CHILD' || matrixType == 'PARENT') {
				var mappingSearchObj = search.create({
					type: "customrecord_ns_woo_attributes_mapping",
					filters: [
						["custrecord_ns_woo_attribute", "anyof", attributeId],
						"AND",
						["custrecord_ns_woo_mapping_filed", "anyof", setupRecId]
					],
					columns: [
						search.createColumn({
							name: "custrecord_ns_woo_attribute_id",
							label: "WooCommerce Attribute Id"
						}),
						search.createColumn({
							name: "custrecord_ns_woo_filed_id",
							label: "Item Filed Id"
						})
					]
				});
				var pagedData = mappingSearchObj.runPaged({
					pageSize: 1
				});
				log.audit({
					title: 'Attribute search Reasult',
					details: pagedData
				})
				if (pagedData.count > 0) {
					var currentPage = pagedData.fetch(0);
					var result = currentPage.data[0];
					formattedObj.id = result.getValue({
						name: "custrecord_ns_woo_attribute_id",
						label: "WooCommerce Attribute Id"
					});


					formattedObj.options = itemRecObj.getText({
						fieldId: result.getValue({
							name: "custrecord_ns_woo_filed_id",
							label: "Item Filed Id"
						})
					});
					formattedObj.variation = true;

				} else {
					var mappingSearchObj = search.create({
						type: "customrecord_woocommerce_attributes",
						filters: [
							["internalid", "anyof", attributeId]
						],
						columns: [
							search.createColumn({
								name: "custrecord_woo_attribute_id",
							})
						]
					});
					var pagedData = mappingSearchObj.runPaged({
						pageSize: 1
					});
					if (pagedData.count > 0) {
						var currentPage = pagedData.fetch(0);
						var result = currentPage.data[0];
						formattedObj.id = result.getValue({
							name: "custrecord_woo_attribute_id",
						});
						formattedObj.options = terms;
						formattedObj.variation = false;
					}
				}
			} else {
				var mappingSearchObj = search.create({
					type: "customrecord_woocommerce_attributes",
					filters: [
						["internalid", "anyof", attributeId]
					],
					columns: [
						search.createColumn({
							name: "custrecord_woo_attribute_id",
						})
					]
				});
				var pagedData = mappingSearchObj.runPaged({
					pageSize: 1
				});
				if (pagedData.count > 0) {
					var currentPage = pagedData.fetch(0);
					var result = currentPage.data[0];
					formattedObj.id = result.getValue({
						name: "custrecord_woo_attribute_id",
					});
					formattedObj.options = terms;
					formattedObj.variation = false;
				}
			}

			formattedObj.visible = true;
			formattedObj.position = 0;
			return formattedObj
		}
		return {
			itemExportproductUpdate: itemExportproductUpdate,
			checksalesdate: checksalesdate
		};
	});