'use strict';

const fs = require('fs');
const path = require('path');
const promisedHandlebars = require('promised-handlebars');
const HandlebarsAsync = promisedHandlebars(require('handlebars'));
const Handlebars = require('handlebars');
const handlebarsWax = require('handlebars-wax');
const addressFormat = require('address-format');
const moment = require('moment');
const Swag = require('swag');
const base64Img = require('base64-img');
const isUrl = require('is-url');
const marked = require('marked');

const settings = require('./settings');
const BACKGROUND_COLOR = '#222831';
const ACCENT_COLOR = '#393e46';
const COLLORED_ACCENT_COLOR = '#FF5701';
const TEXT_COLOR = '#FFFFFF';


// Register swag handlebars helpers
Swag.registerHelpers(HandlebarsAsync);
Swag.registerHelpers(Handlebars);

// global  flags
let RENDER_ASCYNC = false;
let RENDER_MARKDOWN = process.env.RENDER_MARKDOWN || false;
let PROCESS_IMAGE =  process.env.PROCESS_IMAGE || false;

const customHelpers = {
	/**
	 *  DO not use arrow functions! https://blog.pixelkritzel.de/posts/handlebars-dont-use-es6-arrow-functions-to-define-helpers/
	 */
	imgPathToBase64(imgPath) {
		// The image processing is disabled by default
		if (!PROCESS_IMAGE) return imgPath;

		// If no path provided throw an error
		if (!imgPath) { throw new Error('No valid path for the profile-picture image!'); }

		if (isUrl(imgPath)) {
			// Promise wrapper for base64Img.requestBase64
			return RENDER_ASCYNC ? new Promise((resolve, reject) => {
				base64Img.requestBase64(imgPath, (err, res, body) => {
					if (err) {
						reject(err);
					}
					resolve(body);
				});
			}) : imgPath;

		} else {
			// try catch
			try {
				if (!fs.existsSync(imgPath)) { throw new Error('The image for the profile picture cannot be found!'); }
				return base64Img.base64Sync(imgPath);
			} catch (e) {
				console.error(`There was an error when trying to convert the image ${imgPath}: ${e}`)
			}
		}
	},

	removeProtocol(url) {
		return url.replace(/.*?:\/\//g, '')
	},

	mdToHtml(string) {
		// The rendering of Markdown markup is disabled by default
		return RENDER_MARKDOWN ? marked(string) : string;
	},

	concat() {
		let res = '';

		for(let arg in arguments){
			if (typeof arguments[arg] !== 'object') {
				res += arguments[arg];
			}
		}

		return res;
	},

	formatAddress(address, city, region, postalCode, countryCode) {
		let addressList = addressFormat({
			address: address,
			city: city,
			subdivision: region,
			postalCode: postalCode,
			countryCode: countryCode
		});

		return addressList.join('<br/>');
	},

	formatDate(date) {
		const parsedDate = new Date(Date.parse(date));
		// let's assume, that a date stringconsisting only of 4 chracters will be solely a year
		return date.length == 4 ? parsedDate.getFullYear() : `${parsedDate.getMonth() + 1}/${parsedDate.getFullYear()}`
	},
};

// Register custom handlebars helpers
HandlebarsAsync.registerHelper(customHelpers);
Handlebars.registerHelper(customHelpers);

/**
 * Setter for the RENDER_MARKDOWN flag
 */
const enableMarkdownSupport = () => RENDER_MARKDOWN = true;

/**
 * Setter for the PROCESS_IMAGE flag
 */
const enableImageProcessing = () => PROCESS_IMAGE = true;

/**
 * Function rendering the resume with 2promised-handlebars" allowing usage of async helpers
 * @param {Object} resumeJson The source resume object
 * @returns {Promise<String>} Promise resolving to the HTML markup
 */
const renderAsync = async (resumeJson) => {
	// change the global flag
	RENDER_ASCYNC = true;
	return await render(resumeJson);
};

/**
 * Renders resume from a resume object and returns HTML Markup
 * @param {Object] resumeJson The source resume object
 * @returns {string|Promise<String>} The rednered HMTML Markupt or a Promise resolving to it
 */
const render = (resumeJson) => {
	let css, resumeTemplate;

	try {
		css = fs.readFileSync(path.resolve(__dirname, 'styles/main.css'), 'utf-8');

		// Replace the default colors if defined in settings
		// Replace background #222831
		if (settings.colors.background) { css = css.replace(new RegExp(BACKGROUND_COLOR, 'g'), settings.colors.background); }
		// Replace accent #393e46
		if (settings.colors.accent) { css = css.replace(new RegExp(ACCENT_COLOR, 'g'), settings.colors.accent); }
		// Replace colored accent
		if (settings.colors.coloredAccent) { css = css.replace(new RegExp(COLLORED_ACCENT_COLOR, 'g'), settings.colors.coloredAccent); }
		// Replace text color
		if (settings.colors.text) { css = css.replace(new RegExp(TEXT_COLOR, 'g'), settings.colors.text); }

		resumeTemplate = fs.readFileSync(path.resolve(__dirname, 'resume.hbs'), 'utf-8');
	} catch (err) {
		throw new Error('The source handlebar template file or the stylesheet could not be read.');
	}

	const handlebars = RENDER_ASCYNC ? handlebarsWax(HandlebarsAsync) : handlebarsWax(Handlebars);

	handlebars.partials(path.resolve(__dirname, 'views/partials/**/*.{hbs,js}'));
	handlebars.partials(path.resolve(__dirname, 'views/components/**/*.{hbs,js}'));

	try	{
		// as long as we use promised-handlebars handlebars.compile returns a Promise!
		return handlebars.compile(resumeTemplate)({
			css: css,
			resume: resumeJson
		});
	} catch (err) {
		throw new Error(`Error when rendering the template: ${err}!`);
	}

};

module.exports = {
	render,
	renderAsync,
	enableMarkdownSupport,
	enableImageProcessing,
};
