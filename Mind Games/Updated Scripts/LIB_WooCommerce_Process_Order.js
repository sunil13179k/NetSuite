/**
 ** @client: WooCommerce	
 ** @author: Gnanadeep & Mahesh Bonagiri	
 ** @dated: 05-07-2020  - MM/DD/YYYY
 ** @Script Name: LIB_WooCommerce_Process_Order.js
 ** @Description: Library script to create/update customer record.
 ** @NApiVersion 2.x
 ** @NModuleScope Public
 **/
define(['N/record', 'N/search', 'N/file', './LIB_WooCommerce_Create_Customer', './LIB_WooCommerce_Create_Order', './LIB_WooCommerce_Create_Error_Record', './LIB_WooCommerce_Create_Contact'],
	function (record, search, file, LIB_WooCommerce_Create_Customer, LIB_WooCommerce_Create_Order, LIB_WooCommerce_Create_Error_Record, LIB_WooCommerce_Create_Contact) {
		function processOrder(order_details_json, orderDetails, stat) {
			try {
				log.audit('WooCommerce Process Order Script', 'WooCommerce Process Order Script Begins');

				var i = stat.orderIndex;
				var returnObj = {};
				returnObj.error = false;
				var itemRecSkuFieldId = orderDetails['itemRecSkuFieldId'];
				var apiUrl = orderDetails['apiUrl'];
				var consumer_key = orderDetails['consumer_key'];
				var consumer_secret = orderDetails['consumer_secret'];

				//Create JSON File For Single Order
				var dt = new Date();
				var singleOrderFile = file.create({
					name: 'WooCommerce_Order_' + orderDetails['order_id'] + '_' + dt + '.json',
					contents: JSON.stringify(order_details_json),
					folder: orderDetails['orderFolder'],
					fileType: 'JSON'
				}); //contents: order_body_item,
				var singleOrderFileId = singleOrderFile.save();
				log.debug('Create Single Order JSON File', 'Single Order File Id: ' + singleOrderFileId + ' i:' + i);
				orderDetails['orderJsonFileId'] = singleOrderFileId;

				//Array Definition Block
				{
					var order_body_item_json = order_details_json; //JSON.parse(order_response.body);

					orderDetails['order_id'] = order_body_item_json.id;
					orderDetails['parent_id'] = order_body_item_json.parent_id;
					orderDetails['number'] = order_body_item_json.number;
					orderDetails['order_key'] = order_body_item_json.order_key;
					orderDetails['created_via'] = order_body_item_json.created_via;
					orderDetails['version'] = order_body_item_json.version;

					orderDetails['currency'] = order_body_item_json.currency;
					orderDetails['date_created'] = order_body_item_json.date_created;
					orderDetails['date_modified'] = order_body_item_json.date_modified;
					orderDetails['discount_total'] = order_body_item_json.discount_total;
					orderDetails['discount_tax'] = order_body_item_json.discount_tax;

					orderDetails['shipping_total'] = order_body_item_json.shipping_total;
					orderDetails['shipping_tax'] = order_body_item_json.shipping_tax;
					orderDetails['cart_tax'] = order_body_item_json.cart_tax;
					orderDetails['order_total'] = order_body_item_json.total;
					orderDetails['total_tax'] = order_body_item_json.total_tax;
					orderDetails['tax_lines'] = JSON.stringify(order_body_item_json.tax_lines);

					orderDetails['prices_include_tax'] = order_body_item_json.prices_include_tax;
					orderDetails['customer_id'] = order_body_item_json.customer_id;
					orderDetails['customer_ip_address'] = order_body_item_json.customer_ip_address;
					orderDetails['customer_note'] = order_body_item_json.customer_note;

					//Billing Information
					var billaddress = order_body_item_json.billing;
					orderDetails['bill_first_name'] = billaddress.first_name;
					orderDetails['bill_last_name'] = billaddress.last_name;
					orderDetails['bill_company'] = billaddress.company;
					orderDetails['bill_address_1'] = billaddress.address_1;
					orderDetails['bill_address_2'] = billaddress.address_2;
					orderDetails['bill_city'] = billaddress.city;
					orderDetails['bill_state'] = billaddress.state;
					orderDetails['bill_postcode'] = billaddress.postcode;
					orderDetails['bill_country'] = billaddress.country;
					orderDetails['bill_email'] = billaddress.email;
					orderDetails['bill_phone'] = billaddress.phone;

					//Shipping Information
					var shipaddress = order_body_item_json.shipping;
					orderDetails['ship_first_name'] = shipaddress.first_name;
					orderDetails['ship_last_name'] = shipaddress.last_name;
					orderDetails['ship_company'] = shipaddress.company;
					orderDetails['ship_address_1'] = shipaddress.address_1;
					orderDetails['ship_address_2'] = shipaddress.address_2;
					orderDetails['ship_city'] = shipaddress.city;
					orderDetails['ship_state'] = shipaddress.state;
					orderDetails['ship_postcode'] = shipaddress.postcode;
					orderDetails['ship_country'] = shipaddress.country;

					//Payment Information
					orderDetails['payment_method'] = order_body_item_json.payment_method;
					orderDetails['payment_method_title'] = order_body_item_json.payment_method_title;
					orderDetails['transaction_id'] = order_body_item_json.transaction_id;
					orderDetails['date_paid'] = order_body_item_json.date_paid;
					orderDetails['date_completed'] = order_body_item_json.date_completed;
					orderDetails['eGift_Details'] = order_body_item_json.pw_gift_cards_redeemed;

					//Shipping Method Information
					var shipMethod = order_body_item_json.shipping_lines[0];
					if (shipMethod) {
						orderDetails['shipping_method_id'] = shipMethod.id;
						orderDetails['method_title'] = shipMethod.method_title;
						orderDetails['method_id'] = shipMethod.method_id;
						orderDetails['shipping_m_total'] = shipMethod.total;
						orderDetails['shipping_m_total_tax'] = shipMethod.total_tax;
						orderDetails['shipping_m_taxes'] = shipMethod.taxes;
						log.debug('Array Definition Block', 'WooCommerce Shipping Method Title: ' + orderDetails['method_title'] + ' i:' + i);
					}
				} //Array Definition Block
				var orderLineItems = {};
				var errorStatus = 'F';
				//Coupon Information
				log.debug('Array Definition Block', 'WooCommerce Coupon Lines: ' + order_body_item_json.coupon_lines.length + ' i:' + i)
				log.debug('Array Definition Block', 'WooCommerce Coupon Checkbox: ' + orderDetails['couponsCheckbox'] + ' i:' + i)
				log.debug('Array Definition Block', 'WooCommerce eGift Card Checkbox: ' + orderDetails['eGiftCardCheckbox'] + ' ,WooCommerce eGift Card Discount Key: ' + orderDetails['eGiftCardKey'] + ' i:' + i);
				var couponsArray = [];
				var eGiftCardArray = [];
				if (orderDetails['eGift_Details'].length > 0) {
					var eGiftCardDetails = {};
					var eGiftDetails = orderDetails['eGift_Details'][0];
					if (orderDetails['eGiftCardRedemItem']) {
						eGiftCardDetails.Ns_eGiftCardId = orderDetails['eGiftCardRedemItem'];

					} else {
						eGiftCardDetails.Ns_eGiftCardId = orderDetails['eGiftCardRedemItem'];
						errorStatus = 'T';
						errorMsg = 'eGift Card item is not set in setup record.';
						log.debug('Order Line Item Search', 'eGift Card item is not set in setup record.' + ' i:' + i);
					}
					orderDetails['egift_redemption'] = true;
					//eGiftCardDetails.id = couponData.id;
					eGiftCardDetails.name = eGiftDetails.number;
					eGiftCardDetails.rate = parseFloat(Number(eGiftDetails.amount)).toFixed(2);
					eGiftCardDetails.amount = parseFloat(Number(eGiftDetails.amount)).toFixed(2);
					eGiftCardDetails.sku = 'eGift Card for Redamations';
					//eGiftCardDetails.discount_tax = couponData.discount_tax;
					eGiftCardArray.push(eGiftCardDetails);
				}
				log.audit('eGift Card Details',JSON.stringify(eGiftCardArray))
				if (orderDetails['couponsCheckbox']) {
					for (var couponIndex = 0; couponIndex < order_body_item_json.coupon_lines.length; couponIndex++) {
						var couponDetails = {};
						var couponData = order_body_item_json.coupon_lines[couponIndex];
						couponDetails.meta_data = couponData.meta_data;
						//eGift Card Info
						if (orderDetails['eGiftCardCheckbox'] && orderDetails['eGiftCardKey']) {
							var eGiftCardDetails = {};
							if (couponData.meta_data.length > 0) {
								for (var metaDataIndex = 0; couponDetails.meta_data.length > metaDataIndex; metaDataIndex++) {
									if (couponDetails.meta_data[metaDataIndex].value.discount_type == orderDetails['eGiftCardKey']) {
										if (orderDetails['eGiftCardRedemItem']) {
											eGiftCardDetails.Ns_eGiftCardId = orderDetails['eGiftCardRedemItem'];

										} else {
											eGiftCardDetails.Ns_eGiftCardId = orderDetails['eGiftCardRedemItem'];
											errorStatus = 'T';
											errorMsg = 'eGift Card item is not set in setup record.';
											log.debug('Order Line Item Search', 'eGift Card item is not set in setup record.' + ' i:' + i);
										}
										orderDetails['egift_redemption'] = true;
										eGiftCardDetails.id = couponData.id;
										eGiftCardDetails.name = couponData.code;
										eGiftCardDetails.rate = parseFloat(Number(couponData.discount)).toFixed(2);
										eGiftCardDetails.amount = parseFloat(Number(couponData.discount)).toFixed(2);
										eGiftCardDetails.sku = couponDetails.meta_data[metaDataIndex].value.discount_type;
										eGiftCardDetails.discount_tax = couponData.discount_tax;

										eGiftCardArray.push(eGiftCardDetails);

										break;
									} //if(couponDetails.meta_data[metaDataIndex].value.discount_type == orderDetails['eGiftCardKey'])
									else {
										orderDetails['egift_redemption'] = false;
									}
								} //for (var metaDataIndex = 0; couponDetails.meta_data.length>metaDataIndex; metaDataIndex++)
							} //if(metadata length>0)
						} //if(orderDetails['eGiftCardCheckbox'])
						if (!orderDetails['egift_redemption']) {
							if (orderDetails['discountItem']) {
								couponDetails.Ns_DiscountId = orderDetails['discountItem'];
							} else {
								couponDetails.Ns_DiscountId = orderDetails['discountItem'];
								errorStatus = 'T';
								errorMsg = 'Discount item is not set in setup record.';
								log.debug('Order Line Item Search', 'Discount item is not set in setup record.' + ' i:' + i);
							}
							orderDetails['coupon_redemption'] = true;
							couponDetails.id = couponData.id;
							couponDetails.name = couponData.code;
							if (couponData.meta_data.length > 0)
								couponDetails.sku = couponDetails.meta_data[0].value.discount_type;
							else
								couponDetails.sku = '';
							couponDetails.rate = parseFloat(Number(couponData.discount)).toFixed(2);
							couponDetails.amount = parseFloat(Number(couponData.discount)).toFixed(2);
							couponDetails.discount_tax = couponData.discount_tax;

							couponsArray.push(couponDetails);
						} //if(!orderDetails['egift_redemption'] )
					} //for (var couponIndex = 0; couponIndex < order_body_item_json.coupon_lines; couponIndex++ )
					orderLineItems.couponsArray = couponsArray;
					orderLineItems.eGiftCardArray = eGiftCardArray;

					log.debug('Formated Order Line Items', 'Coupon Line Items: ' + JSON.stringify(orderLineItems.couponsArray) + ' i:' + i);
					log.debug('Formated Order Line Items', 'eGift Card Line Items: ' + JSON.stringify(orderLineItems.eGiftCardArray) + ' i:' + i);
				} else {
					orderLineItems.couponsArray = couponsArray;
					orderLineItems.eGiftCardArray = eGiftCardArray;
					log.audit('Coupons', 'Coupons Checkbox is unchecked or Coupon Key is not set in the setup record')
				}
				//Feeline Information. Set this at line level.
				var feeLineArray = [];
				if (orderDetails['feeLineCheckbox']) {
					var feeLine_details = order_body_item_json.fee_lines;
					log.debug('Array Definition Block', 'WooCommerce Feeline Details: ' + JSON.stringify(feeLine_details) + ' i:' + i);
					for (var feeLineIndex = 0; feeLineIndex < feeLine_details.length; feeLineIndex++) {
						var feeLineitemdata = {};

						if (orderDetails['feeLineItem']) {
							feeLineitemdata.NS_FeeLineId = orderDetails['feeLineItem'];
						} else {
							feeLineitemdata.NS_FeeLineId = orderDetails['feeLineItem'];
							errorStatus = 'T';
							errorMsg = 'Feeline item is not set in setup record.';
							log.debug('Order Line Item Search', 'Error Status: ' + errorStatus + '\nError Message: ' + errorMsg + ' i:feeLineIndex::' + i + ':' + feeLineIndex + ' i:' + i);
						}
						feeLineitemdata.id = feeLine_details[feeLineIndex].id;
						feeLineitemdata.name = feeLine_details[feeLineIndex].name;
						feeLineitemdata.sku = feeLine_details[feeLineIndex].name;
						feeLineitemdata.rate = parseFloat(feeLine_details[feeLineIndex].total).toFixed(2);
						feeLineitemdata.amount = parseFloat(feeLine_details[feeLineIndex].amount).toFixed(2);
						feeLineitemdata.tax_class = feeLine_details[feeLineIndex].tax_class;
						feeLineitemdata.tax_status = feeLine_details[feeLineIndex].tax_status;
						feeLineitemdata.total_tax = feeLine_details[feeLineIndex].total_tax;
						feeLineitemdata.meta_data = feeLine_details[feeLineIndex].meta_data;

						feeLineArray.push(feeLineitemdata);
					} //if(var feeLineIndex = 0; feeLineIndex < feeLine_details.length; feeLineIndex++)
					orderLineItems.feeLineArray = feeLineArray;
					log.audit('FeeLine Items Array', 'FeeLine Items: ' + JSON.stringify(orderLineItems.feeLineArray) + ' i:' + i);
				} else {
					orderLineItems.feeLineArray = feeLineArray;
					log.audit('FeeLine Item', 'FeeLine Item Checkbox is Uncheched' + ' i:' + i);
				}
				//Stripe Charge Item
				{
					if (orderDetails['stripeChargeCheckBox']) {
						var stripeObj = {};
						var metaData = order_body_item_json.meta_data;
						//log.debg('metadata',JSON.stringify(metaData)+ ' i:' + i )
						if (orderDetails['stripeChargeKey'] && orderDetails['stripeChargeItemId'] && metaData.length > 0) {
							for (var metadataIndex = 0; metaData.length > metadataIndex; metadataIndex++) {
								if (metaData[metadataIndex].key == orderDetails['stripeChargeKey']) {
									stripeObj.id = metaData[metadataIndex].id;
									stripeObj.description = metaData[metadataIndex].key;
									stripeObj.amount = Number(metaData[metadataIndex].value)
								}
							}
							if (stripeObj.id)
								orderLineItems.stripeObj = stripeObj;
							else
								orderLineItems.stripeObj = null;
							log.audit({
								title: 'Stripe Charge Item Object',
								details: 'Stripe Charge ' + JSON.stringify(stripeObj) + ' i:' + i
							});
						} else {
							if (!orderDetails['stripeChargeKey'])
								log.audit({
									title: 'Stripe Charge Item',
									details: 'Stripe Charge Key Not Set In the Setup reccord, ' + ' i:' + i
								});
							if (!orderDetails['stripeChargeItemId'])
								log.audit({
									title: 'Stripe Charge Item',
									details: 'Stripe Charge Item Not Set In the Setup reccord, ' + ' i:' + i
								});
						}
					} else {
						log.audit({
							title: 'Stripe Charge Item',
							details: 'Stripe Charge Check Box Is Unchecked in the Setup Record, ' + ' i:' + i
						});
					}
				}

				//Retrieve Order Line Items
				{
					var lineItemsArray = [];

					var order_item = order_body_item_json.line_items;
					log.debug('Order Line Items', 'Number of Line Items: ' + order_item.length + ' i:' + i);

					for (var lineItemIndex = 0; lineItemIndex < order_item.length; lineItemIndex++) {
						var lineitemdata = {};
						//parseFloat((subtotal - discounttotal) + altshippingcost).toFixed(2)
						lineitemdata.id = order_item[lineItemIndex].id;
						lineitemdata.quantity = order_item[lineItemIndex].quantity;
						var lineItemPrice = Number(order_item[lineItemIndex].subtotal) / Number(order_item[lineItemIndex].quantity);
						lineitemdata.rate = parseFloat(lineItemPrice).toFixed(2);
						lineitemdata.amount = parseFloat(order_item[lineItemIndex].subtotal).toFixed(2);
						lineitemdata.name = order_item[lineItemIndex].name;
						lineitemdata.product_id = order_item[lineItemIndex].product_id;
						lineitemdata.variation_id = order_item[lineItemIndex].variation_id;
						lineitemdata.tax_class = order_item[lineItemIndex].tax_class;
						lineitemdata.subtotal_tax = order_item[lineItemIndex].subtotal_tax;
						lineitemdata.total = parseFloat(order_item[lineItemIndex].total).toFixed(2);
						lineitemdata.total_tax = order_item[lineItemIndex].total_tax;
						lineitemdata.taxes = order_item[lineItemIndex].taxes;
						lineitemdata.meta_data = order_item[lineItemIndex].meta_data;

						var sku = order_item[lineItemIndex].sku;
						lineitemdata.sku = sku;
						log.debug('Order Line Item', 'WooCommerce SKU : ' + sku + ' i:lineItemIndex::' + i + ':' + lineItemIndex);

						//Set skipResults = true when there is problem with item search
						var skipResults = false;
						lineitemdata.NS_ItemId = 0;
						var itemSearch = '';
						if (sku != null && sku != '') {
							//Create Item Search
							try {
								if (itemRecSkuFieldId == 'internalidnumber') {
									if (!isNaN(Number(sku))) {
										itemSearch = search.create({
											type: search.Type.ITEM,
											filters: [
												[itemRecSkuFieldId, 'equalto', Number(sku)],
												'AND',
												['isinactive', 'is', 'F']
											]
										});
									} else {
										lineitemdata.NS_ItemId = 0;
										skipResults = true;
										errorStatus = 'T';
										errorMsg = 'Expected number, got alpha-numerical SKU. SKU: ' + sku;
										log.error('Order Line Item Search', 'Error Status: ' + errorStatus + '\nError Message: ' + errorMsg + ' i:lineItemIndex::' + i + ':' + lineItemIndex);
									}
								} else {
									var itemSearch = search.create({
										type: search.Type.ITEM,
										filters: [
											[itemRecSkuFieldId, 'is', sku],
											'AND',
											['isinactive', 'is', 'F']
										]
									});
								}
								//log.debug( 'Order Line Item Search', 'itemSearch : ' + itemSearch);

								if (!skipResults) {
									var item_Result = itemSearch.run().getRange({
										start: 0,
										end: 10
									});
									log.audit('Order Line Item Search', 'Item Search Result Length: ' + item_Result.length + ' i:lineItemIndex::' + i + ':' + lineItemIndex);

									if (item_Result && item_Result.length > 0) {
										if (item_Result.length == 1) {
											lineitemdata.NS_ItemId = item_Result[0].id;
											log.debug('Order Line Item Search', 'NetSuite Item ID: ' + item_Result[0].id + ' i:lineItemIndex::' + i + ':' + lineItemIndex);
										} else {
											lineitemdata.NS_ItemId = 0;
											errorStatus = 'T';
											errorMsg = 'There Are More Then One Item With SKU: ' + sku + '. No of items found: ' + item_Result.length;
											log.debug('Order Line Item Search', 'Error Status: ' + errorStatus + '\nError Message: ' + errorMsg + ' i:lineItemIndex::' + i + ':' + lineItemIndex);
										}
									} //if(item_Result && item_Result.length > 0)
									else {
										lineitemdata.NS_ItemId = 0;
										errorStatus = 'T';
										errorMsg = 'No Item Found With SKU: ' + sku;
										log.debug('Order Line Item Search', 'Error Status: ' + errorStatus + '\nError Message: ' + errorMsg + ' i:lineItemIndex::' + i + ':' + lineItemIndex);
									}
								} //if(errorStatus == 'F')

							} //try
							catch (itemSeaError) {
								lineitemdata.NS_ItemId = 0;
								errorStatus = 'T';
								errorMsg = 'Error Name: ' + itemSeaError.name + ' Message: ' + itemSeaError.message;
								log.debug('Order Line Item Search', 'Error Status: ' + errorStatus + '\nError: ' + errorMsg + ' i:lineItemIndex::' + i + ':' + lineItemIndex);
							}
						} //if(sku != null && sku != '')
						else {
							lineitemdata.NS_ItemId = 0;
							errorStatus = 'T';
							errorMsg = "Item's SKU field is empty. SKU: " + sku;
							log.debug('Order Line Item Search', 'Error Status: ' + errorStatus + '\nError Message: ' + errorMsg + ' i:lineItemIndex::' + i + ':' + lineItemIndex);
						}
						lineItemsArray.push(lineitemdata);
					} //for (var lineItemIndex = 0; lineItemIndex < order_item.length; lineItemIndex++)
					orderLineItems.lineItemsArray = lineItemsArray;
					log.debug('Formated Order Line Items', 'Order Line Items: ' + JSON.stringify(orderLineItems.lineItemsArray) + ' i:' + i);
				} //Retrieve Order Line Items

				//Error in item record if error status is true
				if (errorStatus == 'T') {
					log.debug('Item Record Error', 'Error Status: ' + errorStatus + '\nError Message: ' + errorMsg + ' i:' + i);
					var errorRecId = LIB_WooCommerce_Create_Error_Record.createErrorRecord(orderDetails, orderLineItems, errorMsg);
					if (errorRecId != '0') {
						log.debug('Item Record Error', 'Error Record with ID: ' + errorRecId + ' Created Due To Line Item Error For WooCommerce Order With ID: ' + orderDetails['order_id'] + ' i' + i);
						stat.createdErrorRecords++;
					} else {
						stat.existingErrorRec++;
					}
				} else {
					var contactId = '';
					var customerId = '';
					var errors = false;
					var custCompany = false;
					try {
						if (orderDetails['ship_company'] && orderDetails['customerAsCompany']) {
							var custCompany = true;
						}
						if (orderDetails['bill_email']) {
							customerId = LIB_WooCommerce_Create_Customer.createCustomer(orderDetails, custCompany);
							log.debug('Create Customer Record', 'Create New Customer Record Return Value: ' + customerId + ' i:' + i);

							if (isNaN(customerId)) {
								errors = true;
							} else {
								if (orderDetails['create_contact'] == true) {
									if (custCompany) {
										contactId = LIB_WooCommerce_Create_Contact.createContact(orderDetails, customerId);
									} else {
										contactId = LIB_WooCommerce_Create_Contact.createContact(orderDetails, 0);
									}
									log.debug('Create Contact Record', 'Create New Contact Record Return Value: ' + contactId + ' i:' + i);

									if (isNaN(contactId)) {
										errors = true;
									}
								} else {
									log.debug('Contact Search Block', 'Create Contact CheckBox is not checked' + ' i:' + i);
								}
							}
							if (errors) {
								var errorIn = '';
								if (isNaN(customerId)) {
									var errorRecId = LIB_WooCommerce_Create_Error_Record.createErrorRecord(orderDetails, orderLineItems, customerId);
									//log.debug( 'Create Error Record', 'Error Record with ID: ' + errorRecId + ' Create Error record Due To Customer Error For WooCommerce Order With ID: ' + orderDetails['order_id'] );
									errorIn = 'Customer';
								}
								if (isNaN(contactId) && orderDetails['create_contact'] == true) {
									var errorRecId = LIB_WooCommerce_Create_Error_Record.createErrorRecord(orderDetails, orderLineItems, contactId);
									//log.debug( 'Create Error Record', 'Error Record with ID: ' + errorRecId + ' Create Error record Due To Contact Error For WooCommerce Order With ID: ' + orderDetails['order_id'] );
									errorIn = 'Contact';
								}
								if (!isNaN(errorRecId)) {
									log.debug('Create Error Record', 'Error Record with ID: ' + errorRecId + ' Created Due To ' + errorIn + ' Error For WooCommerce Order With ID: ' + orderDetails['order_id'] + ' i' + i);
									stat.createdErrorRecords++;
								} else {
									stat.existingErrorRec++;
								}
							} else //if( !isNaN(customerId) && !isNaN(contactId) )
							{
								var salesOrderId = LIB_WooCommerce_Create_Order.createSalesOrder(customerId, orderDetails, orderLineItems, contactId);
								log.debug('Create Sales Order', 'Sales Order Script Return Value: ' + salesOrderId + ' i:' + i);

								if (isNaN(salesOrderId)) //salesOrderId.id == 0
								{
									var errorRecId = LIB_WooCommerce_Create_Error_Record.createErrorRecord(orderDetails, orderLineItems, salesOrderId);
									if (!isNaN(errorRecId)) {
										log.debug('Create Error Record', 'Error Record with ID: ' + errorRecId + ' Created Due To Sales Order Error For WooCommerce Order With ID: ' + orderDetails['order_id'] + ' i' + i);
										stat.createdErrorRecords++;
									} else {
										stat.existingErrorRec++;
									}
								} else {
									log.debug('Create Sales Order', 'Sales Order Record With ID: ' + salesOrderId + ' Created For WooCommerce Order With ID: ' + orderDetails['order_id'] + ' i' + i);
									stat.createdSalesOrders++;
								}
							} //if(customerId=='0') else
						} //if(orderDetails['bill_email'] != null || orderDetails['bill_email'] != undefined || orderDetails['bill_email'] != '')
						else {
							customerId = 'Error in Customer Search. ' + 'Customer email is either undefined or empty. Customer Email: ' + orderDetails['bill_email'];
							log.debug({
								title: 'Customer Record Search',
								details: customerId + ' i:' + i
							});
						}
					} //try
					catch (e) {
						customerId = 'Error in customer search. \nError: ' + e.name + '\nDetails: ' + e.message;
						log.debug({
							title: 'Customer Search Catch Block Error',
							details: '\nError: ' + e.name + '\nDetails: ' + e.message
						});
					}
				}
				returnObj.statObj = stat;
				return returnObj;
			} //try
			catch (e) {
				log.debug('Catch Block Error in Processing Order', 'Error: ' + e.name + ', \nDetails: ' + e.message);
				var errorMsg = 'Error in Processing Order. ' + '\nError: ' + e.name + ', \nDetails: ' + e.message;

				returnObj.error = true;
				returnObj.errorObj = e;
				returnObj.statObj = stat;
				return returnObj;
			} finally {
				log.debug('WooCommerce Process Order Script', 'WooCommerce Process Order Script Ends');
			}
		}

		return {
			processOrder: processOrder
		};
	});