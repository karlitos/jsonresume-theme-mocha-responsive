'use strict';

const fs = require('fs');
const path = require('path');
const promisedHandlebars = require('promised-handlebars');
const HandlebarsAsync = promisedHandlebars(require('handlebars'));
const Handlebars = require('handlebars');
const handlebarsWax = require('handlebars-wax');
const addressFormat = require('address-format');
const imageToBase64 = require('image-to-base64');
const marked = require('marked');

const settings = require('./settings');
const BACKGROUND_COLOR = '#222831';
const ACCENT_COLOR = '#393e46';
const COLLORED_ACCENT_COLOR = '#FF5701';
const TEXT_COLOR = '#FFFFFF';

// global  flags
let RENDER_ASCYNC = false;
let RENDER_MARKDOWN = process.env.RENDER_MARKDOWN || false;
let PROCESS_IMAGE =  process.env.PROCESS_IMAGE || false;

const customHelpers = {
	/**
	 *  DO NOT USE ARROW FUNCTIONS! https://blog.pixelkritzel.de/posts/handlebars-dont-use-es6-arrow-functions-to-define-helpers/
	 */
	is: function(val1, val2, options) {
		if(val1 && val1 === val2) {
			return options.fn(this);
		}
		return options.inverse(this);
	},

	lowercase: function(str) {
		return str.toLowerCase();
	},

	and: function(testA, testB, options) {
		if (testA && testB) {
			return options.fn(this);
		} else {
		  	return options.inverse(this);
		}
	},

	imgPathToBase64: async function(imgPath) {
		try {
			// The image processing is disabled by default
			if (!PROCESS_IMAGE) return imgPath;

			// If no path provided throw an error
			if (!imgPath) { throw new Error('No valid path for the profile-picture image!'); }

			return RENDER_ASCYNC ? `data:image/jpg;base64,${await imageToBase64(imgPath)}` : imgPath;
		} catch (e) {
			throw new Error(`There was an error when trying to convert the image ${imgPath}: ${e}`)
		}
	},

	removeProtocol: function(url) {
		return url.replace(/.*?:\/\//g, '')
	},

	mdToHtml: function(string) {
		// The rendering of Markdown markup is disabled by default
		return RENDER_MARKDOWN ? marked(string) : string;
	},

	concat: function() {
		let res = '';

		for(let arg in arguments){
			if (typeof arguments[arg] !== 'object') {
				res += arguments[arg];
			}
		}

		return res;
	},

	formatAddress: function(address, city, region, postalCode, countryCode) {
		let addressList = addressFormat({
			address: address,
			city: city,
			subdivision: region,
			postalCode: postalCode,
			countryCode: countryCode
		});

		return addressList.join('<br/>');
	},

	formatDate: function(dateString) {
		const parsedDate = new Date(dateString);
		// standalone year
		if (/^([1-2][0-9]{3})$/.test(dateString)) {
			return (parsedDate.getFullYear()).toString();
		// year month YYYY-MM format
		} else if (/^([1-2][0-9]{3}-[0-1]?[0-9])$/.test(dateString)) {
			return `${String(parsedDate.getMonth() + 1).padStart(2, '0')}/${parsedDate.getFullYear()}`;
		} else {
		// return the date in DD/MM/YYYY format
			return parsedDate.toLocaleDateString('en-GB', {year: 'numeric', month: '2-digit', day: '2-digit'});
		}
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
	let css, fa, faV4Shim, resumeTemplate;

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
		fa = fs.readFileSync(path.resolve(__dirname, "node_modules/@fortawesome/fontawesome-free/css/all.min.css"), 'utf-8');
		
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
			fa: fa,
			faV4Shim: faV4Shim,
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
