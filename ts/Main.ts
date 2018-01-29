import * as $ from 'jquery'

// import '../lib/jquery-ui-1.12.1.custom/jquery-ui'
import 'jquery-ui/ui/disable-selection'
import 'jquery-ui/ui/widgets/droppable'
import 'jquery-ui/ui/widgets/sortable'


import { GUI, Controller } from "./GUI"
import { Webcam } from "./Webcam"
import { Renderer } from "./Renderer"
import { ShaderManager } from "./ShaderManager"
import { Gif, GifManager } from "./Gif"
import { BPM } from "./BPM"
// import { FilterManager } from "./Filters"

let ctrlKey = 17
let cmdKey = 91
let vKey = 86
let cKey = 67

let gifJokey: GifJokey = null

type TypewriterItem = string | {text: string, pause: string}
type TypewriterList = { name: string, list: TypewriterItem[], app?: ()=> void }


class Typewriter {
	
	typewriterList: TypewriterList
	typewriterLists: TypewriterList[]
	sequence: string[]
	el: Element
	loopNum = 0
	rotateNum: number = 0
	period: number
	text: string
	isDeleting: boolean

	paused:string = null

	numFlan = 0

	constructor(el: Element, typewriterLists: TypewriterList[], sequence: string[], period: number) {
		this.typewriterLists = typewriterLists
		this.sequence = sequence
		this.typewriterList = typewriterLists.find( (item: TypewriterList) => item.name == sequence[this.rotateNum])
		this.el = el;
		this.period = period || 1000;
		this.text = '';
		this.tick();
		this.isDeleting = false;
	}

	tick() {

		var i = this.loopNum % this.typewriterList.list.length;
		let typewriterItem = this.typewriterList.list[i];
		let fullTxt = ''

		if(typeof typewriterItem === "string") {
			fullTxt = typewriterItem
		} else if (typeof typewriterItem === "object") {
			fullTxt = typewriterItem.text
			this.paused = typewriterItem.pause
		}

		if (this.isDeleting) {
			this.text = fullTxt.substring(0, this.text.length - 1);
		} else {
			this.text = fullTxt.substring(0, this.text.length + 1);
		}

		this.el.innerHTML = '<span class="wrap">'+this.text+'</span>';

		var that = this;
		var delta = 200 - Math.random() * 100;

		if (this.isDeleting) { delta /= 3; }

		if (!this.isDeleting && this.text === fullTxt) {
			if(this.paused == null) {
				delta = this.period;
				this.isDeleting = true;
			}
		} else if (this.isDeleting && this.text === '') {
			this.next()
		}

		setTimeout(function() {
			that.tick();
		}, delta);
	}

	static flan() {
		$('.typewriter').addClass('top');
		$("#paperCanvas").show();
		// $("#soundCanvas").show();
		(<any>window).flanOn = true
	}

	static gj() {
		$('.typewriter').removeClass('top');
		$("#paperCanvas").hide();
		$("#result").show();

		let webcamWidth = location.hash.length > 0 ? parseInt(location.hash.substring(1)) : null
		if(webcamWidth != null && Number.isFinite(webcamWidth)) {
			Webcam.WIDTH = webcamWidth
		}

		let cameraInitialized = ()=> {
			$('body').append('<iframe id="music" width="100%" height="300" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/playlists/91049633&amp;color=%23ff5500&amp;auto_play=true&amp;hide_related=false&amp;show_comments=true&amp;show_user=true&amp;show_reposts=false&amp;show_teaser=true&amp;visual=true"></iframe>')
			gifJokey.webcamLoaded()
			return
		}

		gifJokey.webcam = new Webcam(cameraInitialized, webcamWidth)
		gifJokey.initializeClipboard()
	}

	static tweet() {

	}

	next() {
		this.text = ''
		this.isDeleting = false
		this.loopNum++
		if(this.loopNum == this.typewriterList.list.length) {
			this.loopNum = 0
			this.nextRotate()
		}
	}

	nextRotate() {
		this.rotateNum++;
		if(this.rotateNum < this.sequence.length) {
			this.typewriterList = this.typewriterLists.find( (item: TypewriterList) => item.name == this.sequence[this.rotateNum])
			this.typewriterList.app()
		}
	}

	goTo(name: string) {
		let rotateNum = this.typewriterLists.findIndex( (item: TypewriterList) => item.name == this.sequence[this.rotateNum])
		if(rotateNum < 0) {
			return
		}
		this.rotateNum = rotateNum
		this.typewriterList = this.typewriterLists[rotateNum]
		this.typewriterList.app()
	}
}

function is_touch_device() {
  return 'ontouchstart' in window        // works on most browsers 
      || navigator.maxTouchPoints;       // works on IE10/11 and Surface
};

let actionName = is_touch_device() ? 'Tap' : 'Click';

let typewriterData: TypewriterList[] = [
	{ name: 'intro', list: [ "Hi Stephan Kobler", "Welcome", "Please make yourself comfortable", "Just lay back and relax", "Ready ?", "All right", "First, I would like to show you \"FLAN\"" ]},
	{ name: 'flan', list: [{ text: actionName + " on the center of your screen", "pause": 'click'}, {text: actionName + " again to generate another pattern", pause: "click" }, "The sound is generated depending on the pattern", "The vertical position of your click affects the number of lines", "The horizontal position affect the number of symbols", "Enjoy", "Having fun?", "All right, let's play with \"GJ\""], app: Typewriter.flan}, 
	{ name: 'gj', list: [{ text: "Please activate your webcam", pause: 'webcam' }, {text: actionName + " when you are ready", pause: 'click' }, {text: actionName + " again", pause: 'click' }, "Like it?", {text: "All right, let's try another one", pause: 'click'}, {text: "One more photo", pause: 'click'}, "Having fun?"], app: Typewriter.gj },
	{ name: 'tweet', list: ["...Ooops I tweeted a photo of you...", "...saying you will hire me...", "thanks for your trust, it was nice to abuse it :-)"], app: Typewriter.tweet},
	{ name: 'no-webcam', list: ["Are you sure you don\'t want to activate your webcam?", "Then You won't be able to hire me...", { text: "Let's try again", pause: "webcam"} ]}
]
let typewriterSequence: string[] = ['intro', 'flan', 'gj', 'tweet']
let typewriterPeriod = 500

class GifJokey {
	
	imageID = 0

	gui: GUI
	folder: GUI
	viewer: Window = null

	// filterManager = new FilterManager(this)
	bpm: BPM = new BPM(this)
	gifManager = new GifManager(this)
	webcam: Webcam = null
	typewriter: Typewriter = null

	renderer: Renderer = null
	shaderManager: ShaderManager = null

	guiWasFocusedWhenPressedEnter = false
	showGifThumbnails = false
	showGIF: boolean = true
	ctrlDown = false

	constructor() {
		console.log("Gif Grave")
		
		$("#camera").click(()=>this.deselectImages())
		$("#gif-thumbnails").mousedown((event:JQueryMouseEventObject)=> {
			if(!$.contains($('#outputs')[0], event.target) && !$.contains($('#thumbnails')[0], event.target)) {
				this.deselectImages()
			}
		})

		let thumbnailsJ: any = $("#thumbnails")
		thumbnailsJ.sortable(({ stop: ()=> this.sortImagesStop() }))
	    thumbnailsJ.disableSelection()
	    $('#thumbnails-container').hide()

		let outputsJ: any = $("#outputs")
		outputsJ.sortable(({ stop: ()=> this.gifManager.sortGifsStop() }))
	    outputsJ.disableSelection()
	    outputsJ.hide()

		$( document ).keydown((event:KeyboardEvent) => this.onKeyDown(event))
		$( '#gui' ).keydown((event:KeyboardEvent) => {
			console.log(event.keyCode)
			if(event.keyCode == 13 || event.keyCode == 27) {
				console.log('prevent key down')
				event.preventDefault()
				event.stopPropagation()
				return -1
			}
		})
		let webcamWidth = location.hash.length > 0 ? parseInt(location.hash.substring(1)) : null
		if(webcamWidth != null && Number.isFinite(webcamWidth)) {
			Webcam.WIDTH = webcamWidth
		}

	    this.createGUI()

	    $('#gif-thumbnails .open-close-btn').mousedown((event:JQueryMouseEventObject)=> {
	    	let outputsJ = $('#outputs')
	    	let visible = outputsJ.is(':visible')
	    	if(visible) {
	    		outputsJ.hide()
	    		this.deselectImages()
	    		document.dispatchEvent(new Event('cameraResized'))
	    		$('#gif-thumbnails .ui-icon').removeClass('ui-icon-caret-1-w').addClass('ui-icon-caret-1-e')
	    	} else {
	    		outputsJ.show()
	    		document.dispatchEvent(new Event('cameraResized'))
	    		$('#gif-thumbnails .ui-icon').removeClass('ui-icon-caret-1-e').addClass('ui-icon-caret-1-w')
	    	}
	    })

	    $('.add-gif-btn').click(()=>this.gifManager.addGif())
	    $('.add-gif-auto-btn').click(()=>this.gifManager.createAutoGif())
	    // $('.snapshot-btn').mousedown((event: JQueryMouseEventObject)=>{
	    // 	this.deselectAndTakeSnapshot()
	    // 	event.stopPropagation()
	    // 	return -1
	    // })
	    $('.upload-image-btn input').change((e:any)=>this.uploadImage(event))
	    $('.upload-image-btn').mousedown((event: JQueryMouseEventObject)=>{
	    	$('.upload-image-btn input').click()
	    	event.stopPropagation()
	    	return -1
	    })
	    
	    this.initializeTypewriter()

	    // this.webcam = new Webcam(()=>this.webcamLoaded(), webcamWidth)

	    // this.toggleGifThumbnails(this.showGifThumbnails)

	    // this.initializeClipboard()
	}

	initializeTypewriter() {
		$("#result").hide()
		var elements = document.getElementsByClassName('typewrite');
		for (var i=0; i<elements.length; i++) {
			this.typewriter = new Typewriter(elements[i], typewriterData, typewriterSequence, typewriterPeriod);
			(<any>window).typewriter = this.typewriter
		}
		// INJECT CSS
		var css = document.createElement("style");
		css.type = "text/css";
		css.innerHTML = ".typewrite > .wrap { border-right: 0.08em solid #fff}";
		document.body.appendChild(css);
	}
	
	initializeClipboard() {

		$(document).keydown((e)=> {
			if (e.keyCode == ctrlKey || e.keyCode == cmdKey) { 
				this.ctrlDown = true
			} else if (this.ctrlDown && e.keyCode == cKey && this.isImageSelected() && !this.gui.isFocused()) {
				this.shaderManager.copyEffects()
			} else if (this.ctrlDown && e.keyCode == vKey && this.isImageSelected() && !this.gui.isFocused()) {
				this.shaderManager.pastEffects()
			}
		}).keyup((e)=> {
			if (e.keyCode == ctrlKey || e.keyCode == cmdKey) {
				this.ctrlDown = false
			}
		})
	}

	onKeyDown(event: KeyboardEvent) {
		if(event.keyCode == 32) {			// space bar
			// if(this.typewriter.waitingSpace) {
			// 	this.typewriter.pressedSpace = true
			// }
			// this.deselectAndTakeSnapshot()
			event.preventDefault()
		} else if(event.keyCode == 13) {	// enter
			// Ignore if one of the dat.gui item is focused
			if(!this.gui.isFocused()) {
				this.bpm.tap()
			}
			this.typewriter.next()

		} else if(event.keyCode == 27) {	// escape
			// Ignore if one of the dat.gui item is focused
			if(!this.gui.isFocused()) {
				this.bpm.stopTap()
			}
		} else if(String.fromCharCode(event.keyCode) == 'R') {
			this.shaderManager.randomizeParams()
		} else if(String.fromCharCode(event.keyCode) == 'D') {
			this.shaderManager.deactivateAll()
		}
	}

	webcamLoaded() {
		this.renderer = new Renderer(this.webcam, this.gui)
		this.shaderManager = new ShaderManager(this.gui, this.renderer.camera, this.renderer.scene, this.renderer.renderer)
		this.renderer.setShaderManager(this.shaderManager)
		document.addEventListener('shaderChanged', ()=> {
			if(this.isImageSelected()) {
				this.updateFilteredImage()
			}
		})
		// this.shaderManager.randomizeParams()
		type ShaderType = {name: string, parameters: any}
		let shaders: ShaderType[] = [{ name: 'Bad TV', parameters: {'Thick distrotion': 1, 'Fine distrotion': 3.8, 'Distrotion': 0.4, 'Roll speed': 0.07} }, 
			{ name: 'RGB Shift', parameters: {'Amount': 0.08, 'Angle': 294} }, 
			{ name: 'Hue & Saturation', parameters: {'Hue': 0.62, 'Saturation': -0.04} }, 
			{ name: 'Mirror', parameters: {'Side': 2} }]

		for(let shader of this.shaderManager.shaders) {
			let shaderParameters = shaders.find((s)=> s.name == shader.object.name)
			shader.object.on = shaderParameters != null
			if(shader.object.on) {
				shader.folder.open()
			} else {
				shader.folder.close()
				continue
			}
			for(let propertyName in shader.object.parameters) {
				let propertiesObject = shader.object.parameters[propertyName]
				propertiesObject.value = shaderParameters.parameters[propertiesObject.name]
			}
			for(let controller of shader.folder.getControllers()) {
				controller.updateDisplay()
			}
		}

		this.shaderManager.onToggleShaders(false)
		this.shaderManager.onParamsChange()
		this.bpm.setBPMinterval(110, null, false)
		this.gifManager.addGif()
	}

	initialize() {
		this.animate()
	}

	createGUI() {

		this.gui = new GUI({ autoPlace: false, width: '100%' })

		document.getElementById('gui').appendChild(this.gui.getDomElement())

		this.folder = this.gui.addFolder('General')

		this.folder.addButton('Take snapshot (Spacebar)', ()=> this.deselectAndTakeSnapshot())
		// this.folder.addFileSelectorButton('Upload image', 'image/*', (event:any)=> this.uploadImage(event))
		this.folder.addButton('Create viewer', ()=> this.createViewer())

		// this.folder.add(this, 'showGifThumbnails').name('Show Gifs').onChange((value: boolean)=> this.toggleGifThumbnails(value))

		this.folder.addSlider('N images / GIF', this.gifManager.numberOfImages, 1, 10).onChange((value:number)=>this.gifManager.numberOfImages = value)
		this.folder.addSlider('Webcam width', Webcam.WIDTH, 100, 1024).onChange((value)=> {
			// this.webcam.resizeVideo(value)
			// this.renderer.resize(this.webcam.width, this.webcam.height)
			location.hash = ''+Math.round(value)
			location.reload()
		})

		this.folder.add(this, 'showGIF').name('Show GIF').onChange(()=>{$('#result').toggle()})
		this.folder.open()

		this.bpm.createGUI(this.gui)
		this.gifManager.createGUI(this.gui)
		// onSliderChange()

		// $(gui.getDomElement()).css({ width: '100%' })
	}

	// toggleGifThumbnails(show: boolean) {
	// 	let gifThumbnailsJ = $('#gif-thumbnails')
	// 	let visible = gifThumbnailsJ.is(':visible')
	// 	if(show && !visible) {
	// 		gifThumbnailsJ.show()
	// 		document.dispatchEvent(new Event('cameraResized'))
	// 	} else if (!show && visible) {
	// 		gifThumbnailsJ.hide()
	// 		document.dispatchEvent(new Event('cameraResized'))
	// 	}
	// }

	setFilteredImage(imageJ:any, resultJ:any) {

		imageJ.siblings('.filtered').remove()

		let imageName = imageJ.attr('data-name')
		resultJ.insertBefore(imageJ)

		this.gifManager.setFilteredImage(imageName, resultJ.clone())

		// if(viewer != null) {
		// 	(<any>viewer).setFilteredImage(imageJ, resultJ)
		// }
	}

	removeImage(imageAlt: string) {
		this.gifManager.removeImage(imageAlt)

		$('#thumbnails').children("[data-name='"+imageAlt+"']").remove()

		// if(viewer != null) {
		// 	(<any>viewer).removeImage(imageAlt)
		// }
		this.nextImage()
	}

	duplicateImage(imageName: string) {

		let imageThumbnailJ = $('#thumbnails').children("[data-name='"+imageName+"']")
		let img: HTMLImageElement = <any>imageThumbnailJ.find('img.original')[0]
		let imageJ = this.addImage(img.src)

		let filteredImageJ = imageThumbnailJ.find('img.filtered').clone()
		filteredImageJ.attr('data-name', imageJ.attr('data-name'))
		this.setFilteredImage(imageJ, filteredImageJ)

		this.nextImage()
	}

	selectImage(imageName: string) {
		let imagesToSelectJ = $('#thumbnails').children("[data-name='"+imageName+"']")
		let imagesAlreadySelected = imagesToSelectJ.hasClass('gg-selected')
		
		if(imagesAlreadySelected || imagesToSelectJ.length == 0) {
			// this.renderer.displayVideo()
			return
		}

		$('#thumbnails').children().removeClass('gg-selected')

		imagesToSelectJ.addClass('gg-selected')

		let imgJ = imagesToSelectJ.find('img.original')
		this.renderer.displayImage(<any>imgJ[0])

		let filteredImageJ = imagesToSelectJ.find('img.filtered')
		if(filteredImageJ.length > 0) {
			let args = JSON.parse(filteredImageJ.attr('data-filter'))
			this.shaderManager.setShaderParameters(args)
		}

		this.gifManager.selectImage(imageName)
		// this.filterManager.setImage(imgJ)
	}

	deselectImages() {
		$('#thumbnails').children().removeClass('gg-selected')
		if(this.renderer != null) {
			this.renderer.displayVideo()
		}
		if(this.gifManager != null) {
			this.gifManager.deselectGif()
		}
	}

	addImage(data_uri: string, callback:(imgJ:any)=>void=null) {
		// display results in page
		let imageName = 'img-' + (this.imageID++)
		let imgJ = $('<img src="' + data_uri + '" data-name="' + imageName + '" alt="' + imageName + '">')
		let img: HTMLImageElement = <any>imgJ[0]
		

		this.gifManager.addImage(imgJ.clone())

		let thumbnailImageJ = imgJ.clone()
		this.createThumbnail(thumbnailImageJ)

		imgJ.on('load', ()=>{
			// this.selectImage(imageName)

			this.nextImage()
			if(callback != null) {
				callback(imgJ)
			}
		})
		// if(viewer != null) {
		// 	(<any>viewer).addImage(imgJ.clone())
		// }
		return thumbnailImageJ
	}

	createThumbnail(imgJ: any, filteredImageJ: any = null) {
		let imageName = imgJ.attr('data-name')
		let liJ = $('<li class="ui-state-default gg-thumbnail" data-name="'+imageName+'">')
		let closeButtonJ = $('<button type="button" class="gg-small-btn close-btn">')
		let closeButtonIconJ = $('<span class="ui-icon ui-icon-closethick">')
		let duplicateButtonJ = $('<button type="button" class="gg-small-btn duplicate-btn">')
		let duplicateButtonIconJ = $('<span class="ui-icon ui-icon-plusthick">')
		let divJ = $('<div class="gg-thumbnail-container">')
		let selectionRectangleJ = $('<div class="gg-selection-rectangle">')
		closeButtonJ.append(closeButtonIconJ)
		duplicateButtonJ.append(duplicateButtonIconJ)
		divJ.append(imgJ.addClass('gg-hidden original'))
		divJ.append(filteredImageJ)
		liJ.append(selectionRectangleJ)
		liJ.append(divJ)
		liJ.append(closeButtonJ)
		liJ.append(duplicateButtonJ)

		closeButtonJ.click(()=> this.removeImage(imageName) )
		duplicateButtonJ.click(()=> this.duplicateImage(imageName) )
		liJ.mousedown((event: JQueryMouseEventObject)=>{
			setTimeout(()=>this.selectImage(imageName), 0)
		}) // add timeout to not to disturbe draggable

		$('#thumbnails').append(liJ)
	}

	takeSnapshot() {
		let sound: any = document.getElementById('shutter-sound')
		sound.currentTime = 0
		sound.play()

		$('body').css({opacity: 0})
		$('body').animate({opacity: 1}, 250)
		// $('body').addClass('flash')
		// setTimeout(()=>$('body').removeClass('flash'), 500)
		
		let imageDataURL = this.webcam.getImage()
		let imageJ = this.addImage(imageDataURL)

		this.updateFilteredImage(imageJ)
	}

	deselectAndTakeSnapshot() {
		this.deselectAndCallback(()=> this.takeSnapshot())
	}

	deselectAndCallback(callback: ()=> void, delay: number=250) {
		if(this.isImageSelected()) {
			this.deselectImages()
			setTimeout(callback, delay)
		} else {
			callback()
		}
	}

	uploadImage(event: any) {
		let files: FileList = event.dataTransfer != null ? event.dataTransfer.files : event.target.files

		for (let i = 0; i < files.length; i++) {
			let file = files.item(i)
			
			if ( /\.(jpe?g|png|gif)$/i.test(file.name) ) {
				var reader = new FileReader()

				reader.addEventListener("load", (event:any)=> {
					let img = new Image()
					img.src = event.target.result
					img.onload = ()=> {

						let canvas = document.createElement('canvas')
						let context = canvas.getContext('2d')

						let imgRatio = img.width / img.height
						let webcamRatio = this.webcam.width / this.webcam.height

						if(imgRatio < webcamRatio) {
							canvas.height = this.webcam.height
							canvas.width = this.webcam.height * imgRatio
						} else {
							canvas.width = this.webcam.width
							canvas.height = this.webcam.width / imgRatio
						}

						context.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height)

						let imageJ = this.addImage(canvas.toDataURL(), (imgJ: any)=> {
							this.renderer.displayImage(<any>imgJ[0])
							setTimeout(()=>this.updateFilteredImage(imageJ), 250)
						})
					}
				}, false)

				reader.readAsDataURL(file)
			}
		}
	}

	getSelectedImage() {
		return $('#thumbnails').children('.gg-selected').first()
	}

	isImageSelected(): boolean {
		return this.getSelectedImage().length > 0
	}

	updateFilteredImage(imageJ: any=null) {
		if(imageJ == null) {
			imageJ = this.getSelectedImage().find('img.original')
		}

		let filtered = this.renderer.getFilteredImage()
		let filteredImage = filtered.image
		let shaderParameters = filtered.shaderParameters

		filteredImage.className = 'filtered'
		let filteredImageJ = $(filteredImage)
		let imageName = imageJ.attr('data-name')
		filteredImageJ.attr('data-name', imageName)

		filteredImageJ.attr('data-filter', JSON.stringify(shaderParameters))

		this.setFilteredImage(imageJ, filteredImageJ)
	}

	nextImage() {
		this.gifManager.nextImage()

		if(this.viewer != null && this.viewer.hasOwnProperty('nextImage')) {
			(<any>this.viewer).nextImage()
		}
	}

	// let sortImagesStart = (event: Event, ui: any)=> {
	// 	let imageName = $(ui.item).attr('data-name')
	// 	selectImage(imageName)
	// }

	sortImagesStop() {
		let thumbnailsJ = $('#thumbnails').children()
		let imageNames: Array<string> = []
		thumbnailsJ.each(function(index: number, element: Element) {
			imageNames.push($(element).attr('data-name'))
		})

		this.gifManager.sortImages(imageNames)
	}

	createViewer() {
		let windowFeatures = "menubar=yes,location=yes,resizable=yes,scrollbars=yes,status=yes"
		this.viewer = window.open("viewer.html", "Gif Grave Viewer", windowFeatures)
	}

	previousIsOnBeat = false

	animate() {
		requestAnimationFrame(()=>this.animate())

		if(!this.bpm.isAutoBPM()) {
			return
		}

		let isOnBeat = this.bpm.isOnBeat()
		if(isOnBeat && !this.previousIsOnBeat) {
			this.nextImage()
		}
		this.previousIsOnBeat = isOnBeat
	}

	emptyThumbnails() {
		$('#thumbnails').empty()
		// $('#thumbnails').append($('<li>').addClass('placeholder'))
	}

	setGif(gif: Gif) {
		this.emptyThumbnails()

		for(let imagePairJ of gif.getImagePairsJ()) {
			this.createThumbnail(imagePairJ.filter('.original'), imagePairJ.filter('.filtered'))
		}
		
		let firstImageJ = gif.getFirstImageJ()
		if(firstImageJ.length > 0) {
			this.selectImage(firstImageJ.attr('data-name'))
		}

		this.nextImage()
	}

	playGifViewer(gif: Gif) {
		if(this.viewer != null) {
			(<any>this.viewer).setGif(gif.containerJ.find('img.filtered').clone())
		}
	}
}

document.addEventListener("DOMContentLoaded", function(event) { 
	gifJokey = new GifJokey()
	gifJokey.initialize();
	(<any>window).gifJokey = gifJokey
});

