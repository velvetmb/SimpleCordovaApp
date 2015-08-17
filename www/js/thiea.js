/*
	Stereoscopic panorama viewer based on Three.js
	----------------------------------------------
	This script contains the functions required to 
	initialise and implement the features of the 
	stereoscopic panorama
*/			
			var camera, scene, renderer, effect=null, controls, deviceType=null, toExit=false, toNotExit=false, stereo = false,
			target = new THREE.Vector3(),	
			selector, selectorElement, selectorSize, exitSelector, exitSelectorElement, tourAudio, tourVideo, tourVideoPlaying = false, transitionImage, transitionImageDuration = 3, transitionVideo, transitionVideoPlaying = false, panoVideo, userHasInteracted = false,
			lon = 90, lat = 0, phi = 0, theta = 0, touchX, touchY,
			hotspots = [], panoLocations = [], trigger = false, triggerCount = 0, exitTrigger = false, exitTriggerCount = 0;
			var selectorScaleMin = 1, selectorScaleMax = 1.5, selectorScaleChange = 0.015;
			var previousLocation, defaultTransitionTime = 60, audioDuration = defaultTransitionTime, timeoutFunction = null;
			var stereoDiv, leftDiv, rightDiv, leftInterior, rightInterior, inWorldDiv, descriptionDuration = 5, divText = "", stereoImgDiv, leftImgDiv, rightImgDiv, leftImg, rightImg;
			var automaticNavigation = false, locationNavigation = false, autoNavigationDuration = 10, inWorldMessageDuration = 2, distanceErrorAllowance = 10, closeLocationExists = false;
			var errorInterval = 12, errorMessageCounter = errorInterval;
			var currentPano = 0;
			
			function init(type) 
			{
				distanceErrorAllowance = localStorage.getItem("distanceErrorAllowance")!=null?localStorage.getItem("distanceErrorAllowance"):10;
				//localStorage.removeItem("distanceErrorAllowance");
				
				automaticNavigation = localStorage.getItem("automaticNavigation")=="true"?true:false;
				locationNavigation = localStorage.getItem("locationNavigation")=="true"?true:false;
				
				if(locationNavigation)
				{
					localStorage.setItem("lastKnownUserLat", 0.0);
					localStorage.setItem("lastKnownUserLong", 0.0);
					requestInterval(checkLocation, autoNavigationDuration*1000);	
				}			
				
				camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
				scene = new THREE.Scene();
				
				if(type=="pc")
				{
					renderer = new THREE.CSS3DRenderer();
					stereo = false;
				}
				
				else if(type=="pcstereo")
				{
					renderer = new THREE.CSS3DStereoRenderer();
					stereo = true;
				}
				
				else if(type=="mobile")
				{
					renderer = new THREE.CSS3DStereoRenderer();
					controls = new THREE.DeviceOrientationControls( camera ); 
					stereo = true;
				}
				
				else
				{
					renderer = new THREE.CSS3DStereoRenderer();
					stereo = true;
				}
								
				renderer.setSize(window.innerWidth, window.innerHeight);
				document.body.appendChild(renderer.domElement);
				
				tourAudio = document.createElement('audio');
				tourAudio.autoplay = false;
				tourAudio.loop = false;
				
				tourVideo = document.createElement('video');
				tourVideo.WebKitPlaysInline = true;
				tourVideo.setAttribute('webkit-playsinline', 'true');
				tourVideo.autoPlay = false;
				tourVideo.loop = false;
				tourVideo.controls = false;
				
				transitionVideo = document.createElement('video');
				transitionVideo.WebKitPlaysInline = true;
				transitionVideo.setAttribute('webkit-playsinline', 'true');
				transitionVideo.autoPlay = false;
				transitionVideo.loop = false;
				transitionVideo.controls = false;
				
				panoVideo = document.createElement('video');
				panoVideo.WebKitPlaysInline = true;
				panoVideo.setAttribute('webkit-playsinline', 'true');
				panoVideo.autoplay = false;
				panoVideo.loop = true;
				panoVideo.controls = false;
				
				document.addEventListener("mousedown", function()
				{
					if(!userHasInteracted)
					{
						userHasInteracted = true;
						tourAudio.play(); 
						tourVideo.play();
						transitionVideo.play();
						panoVideo.play();
						console.log("media started");
					}				
				});
				
				document.addEventListener('touchstart', function()
				{
					//if(!userHasInteracted)
					{
						userHasInteracted = true;
						tourAudio.play(); 
						tourVideo.play();
						transitionVideo.play();
						panoVideo.play();
						console.log("media started");
					}	
				}, false);
				
				transitionImage = document.createElement('img');
				
				selectorSize = window.innerWidth/30;
				selectorElement = document.createElement('div');
				selectorElement.style.width = selectorSize+"px";
				selectorElement.style.height = selectorSize+"px";
				selectorElement.style.borderRadius = selectorSize+"px";
				selectorElement.style.border = "thick solid white";
				selector = new THREE.CSS3DObject( selectorElement );
								
				exitSelectorElement = document.createElement('div');
				exitSelectorElement.style.width = selectorSize+"px";
				exitSelectorElement.style.height = selectorSize+"px";
				exitSelectorElement.style.borderRadius = selectorSize+"px";
				exitSelectorElement.style.border = "thick solid #FFCC00";
				exitSelector = new THREE.CSS3DObject( exitSelectorElement );
				
				camera.add(selector);
				camera.add(exitSelector);
				selector.position.set(0,0,-300);
				exitSelector.position.set(0,0,-300);
				scene.add(camera);
				
				if(type=="mobile")
				{
					window.addEventListener( 'resize', onWindowResize, false );
					window.addEventListener( 'orientationchange', onWindowResize, false );
				}
				
				else
				{
					document.addEventListener( 'mousedown', onDocumentMouseDown, false );
					document.addEventListener( 'mousewheel', onDocumentMouseWheel, false );
					document.addEventListener( 'touchstart', onDocumentTouchStart, false );
					document.addEventListener( 'touchmove', onDocumentTouchMove, false );
					window.addEventListener( 'resize', onWindowResize, false );
				}
				
				//---------STEREO DIV CODE---------------
				stereoDiv = document.createElement("div");			
				leftDiv = document.createElement("div");
				rightDiv = document.createElement("div");
				leftDiv.style.width = rightDiv.style.width = window.innerWidth/2+"px";
				leftDiv.style.height = rightDiv.style.height = window.innerHeight+"px";
				leftDiv.style.overflow = rightDiv.style.overflow = "hidden";
				leftDiv.style.position = rightDiv.style.position = "absolute";
				//leftDiv.style.backgroundColor = rightDiv.style.backgroundColor = "#8B1233";
				leftDiv.style.backgroundColor = rightDiv.style.backgroundColor = "#ffffff";
				leftDiv.style.left = 0+"px";
				leftDiv.style.cssFloat = "left";
				leftDiv.style.zIndex = 2;
				rightDiv.style.right = 0+"px";
				rightDiv.style.cssFloat = "right";
				rightDiv.style.zIndex = 1;
				//leftDiv.style.border = rightDiv.style.border = "2px solid";
				
				leftInterior = document.createElement("div");
				rightInterior = document.createElement("div");
				leftInterior.style.width = rightInterior.style.width = window.innerWidth/2+"px";
				leftInterior.style.position = rightInterior.style.position = "relative";
				leftInterior.style.align = rightInterior.style.align = "center";
				leftInterior.style.textAlign = rightInterior.style.textAlign = "center";
				//leftInterior.style.color = rightInterior.style.color = "#ffffff";
				leftInterior.style.color = rightInterior.style.color = "#000000";
				leftInterior.style.fontSize = rightInterior.style.fontSize = "200%";
				//leftInterior.style.backgroundColor = rightInterior.style.backgroundColor = "white";
				//leftInterior.style.border = rightInterior.style.border = "2px solid";			
				leftDiv.appendChild(leftInterior);
				rightDiv.appendChild(rightInterior);			
				stereoDiv.appendChild(leftDiv);
				stereoDiv.appendChild(rightDiv);

				
				
				stereoImgDiv = document.createElement("div");			
				leftImgDiv = document.createElement("div");
				rightImgDiv = document.createElement("div");
				leftImgDiv.style.width = rightDiv.style.width = window.innerWidth/2+"px";
				leftImgDiv.style.height = rightDiv.style.height = window.innerHeight+"px";
				leftImgDiv.style.overflow = rightDiv.style.overflow = "hidden";
				leftImgDiv.style.position = rightDiv.style.position = "absolute";
				leftImgDiv.style.backgroundColor = rightDiv.style.backgroundColor = "#ffffff";
				leftImgDiv.style.left = 0+"px";
				leftImgDiv.style.cssFloat = "left";
				leftImgDiv.style.zIndex = 2;
				rightImgDiv.style.right = 0+"px";
				rightImgDiv.style.cssFloat = "right";
				rightImgDiv.style.zIndex = 1;
				//leftDiv.style.border = rightDiv.style.border = "2px solid";
				
				leftImg = document.createElement("img");
				rightImg = document.createElement("img");
				leftImg.style.width = rightImg.style.width = window.innerWidth/2+"px";
				leftImg.style.height = rightImg.style.height = window.innerHeight+"px";
				//leftImg.style.position = rightImg.style.position = "relative";	
				leftImgDiv.appendChild(leftImg);
				rightImgDiv.appendChild(rightImg);			
				stereoImgDiv.appendChild(leftImgDiv);
				stereoImgDiv.appendChild(rightImgDiv);
				
				
				//---------MONO DIV CODE---------------
				monoDiv = document.createElement("div");			
				monoDiv.style.width = window.innerWidth+"px";
				monoDiv.style.height = window.innerHeight+"px";
				monoDiv.style.overflow = "hidden";
				monoDiv.style.position = "absolute";
				//leftDiv.style.backgroundColor = rightDiv.style.backgroundColor = "#8B1233";
				monoDiv.style.backgroundColor = rightDiv.style.backgroundColor = "#ffffff";
				monoDiv.style.left = 0+"px";
				monoDiv.style.cssFloat = "left";
				monoDiv.style.zIndex = 2;
				monoDiv.style.right = 0+"px";
				//monotDiv.style.cssFloat = "right";
				monoDiv.style.zIndex = 1;
				//leftDiv.style.border = rightDiv.style.border = "2px solid";
				
				monoInterior = document.createElement("div");
				monoInterior.style.width = window.innerWidth+"px";
				monoInterior.style.position = "relative";
				monoInterior.style.align = "center";
				monoInterior.style.textAlign = "center";
				//leftInterior.style.color = rightInterior.style.color = "#ffffff";
				monoInterior.style.color = "#000000";
				monoInterior.style.fontSize = "200%";
				//leftInterior.style.backgroundColor = rightInterior.style.backgroundColor = "white";
				//leftInterior.style.border = rightInterior.style.border = "2px solid";			
				monoDiv.appendChild(monoInterior);

				
				//---------INWORLD DIV CODE---------------
				inWorldDiv = document.createElement("div");
				inWorldDiv.style.backgroundColor = "black";
				inWorldDiv.style.color = "white";
				inWorldDiv.style.border = "2px solid";	
				inWorldDiv.style.borderRadius = "10px";	
				inWorldDiv.style.align = "center";	
				inWorldDiv.style.textAlign = "center";	
				inWorldDiv.style.display = "inline";	
				inWorldDiv.style.opacity = 0.8;
				inWorldDiv.innerHTML = "";
				
				//---------INWORLD MESSAGE HOLDER CODE---------------
				inWorldMessageHolder = document.createElement("div");
				inWorldMessageHolder.style.backgroundColor = "green";
				inWorldMessageHolder.style.color = "white";
				inWorldMessageHolder.style.border = "2px solid";	
				inWorldMessageHolder.style.borderRadius = "10px";	
				inWorldMessageHolder.style.align = "center";	
				inWorldMessageHolder.style.textAlign = "center";	
				inWorldMessageHolder.style.display = "inline";	
				inWorldMessageHolder.style.opacity = 0.8;
				inWorldMessageHolder.innerHTML = "";
			}

			function animate(type) 
			{
				if(deviceType==null)
					deviceType = type;
				
				if(deviceType=="mobile")
				{
					requestAnimationFrame(animate);
					controls.update();
					
					if(effect!=null)
					{
						effect.render(scene, camera);
					}
					
					else
					{
						renderer.render(scene, camera);
					}
					
					triggerHotspots();
					triggerExit();
				}
				
				else
				{
					requestAnimationFrame(animate);
					//lon +=  0.1;
					lat = Math.max( - 85, Math.min( 85, lat ) );
					phi = THREE.Math.degToRad( 90 - lat );
					theta = THREE.Math.degToRad( lon );
					target.x = Math.sin( phi ) * Math.cos( theta );
					target.y = Math.cos( phi );
					target.z = Math.sin( phi ) * Math.sin( theta );
					camera.lookAt( target );
					//console.log(scene);
					try{
					if(effect!=null)
					{
						effect.render(scene, camera);
					}
					
					else
					{
						renderer.render(scene, camera);
					}
					} catch(err) {
						console.log(scene);
						console.log(err);
					}
					
					triggerHotspots();
					triggerExit();
				}
			}

			function animateSelector(selectorObject)
			{
				if (selectorObject.scale.x<selectorScaleMax)
				{
					selectorObject.scale.x += selectorScaleChange;
					selectorObject.scale.y += selectorScaleChange;
					//console.log("Growing");
				}

				else
				{
					selectorObject.scale.set(1, 1, 1);
				}
			}
			
			function triggerExit()
			{
				var	xRotation = camera.rotation.x;
				var	yRotation = camera.rotation.y;
				var	zRotation = camera.rotation.z;
				//console.log(camera.rotation.x+", "+camera.rotation.y+", "+camera.rotation.z);
				//console.log("exitTriggerCount: "+ exitTriggerCount);
				
				//for mobile view
				if(deviceType=="mobile")
				{
					toExit = (xRotation>=0.6 && xRotation<=2.5) && (yRotation>=-3.1 && yRotation<=3.1)?true:false;
					toNotExit = (xRotation<0.6 || xRotation>2.5) || (yRotation<-3.1 || yRotation>3.1)?true:false;
				}
				
				//for pc and all other views
				else
				{
					toExit = (xRotation>=0.7 && xRotation<=2.3) && (yRotation>=-0.8 && yRotation<=0.8)?true:false;
					toNotExit = (xRotation<0.7 || xRotation>2.3) || (yRotation<-0.8 || yRotation>0.8)?true:false;
				}
				
				if(toExit)
				{					
					animateSelector(exitSelector);
					if(++exitTriggerCount>200)
					{
						exitTrigger = true;
						exitTriggerCount=0;
					}
				}				
							
				if(toNotExit)
				{
					exitTriggerCount=0;
					exitSelector.scale.set(1, 1, 1);
				}
							
				if(exitTrigger)
				{
					exitTrigger = false;
					exitTriggerCount=0;
					exitSelector.scale.set(1, 1, 1);
					//console.log("Loading previous location: "); console.log(previousLocation[0]);
					//renderPano(previousLocation);
					//-----OR-----
					//console.log("Loading starting point");
					//renderPano(start);
					//-----OR-----
					//console.log("Going back to home page");
					//window.location.href="index.html";
					//-----OR-----
					//do nothing
					//-----OR-----
					console.log("Going back to in world menu page");
					window.location.href="mobiletour.html";
				}
									
				else
				{
					//console.log("No exit");
				}
			}
			
			function clearScene()
			{
				tourAudio.src = "";
				tourVideo.src = "";
				transitionVideo.src = "";
				panoVideo.src = "";
				var obj, i;
				for ( i = scene.children.length - 1; i >= 0 ; i -- ) 
				{
					obj = scene.children[ i ];
					if (obj !== camera) 
					{
						scene.remove(obj);
						if(obj instanceof THREE.Mesh) {
						//obj.geometry.dispose();
						obj.geometry.dispose();
						obj.material.dispose();
						//obj.texture.dispose();
						}
					}
				}
			}
						
			function createHotspot(type, parentPano, value, transition, x, y, z, rx, ry, rz, thumbnail)
			{
				var hotspot, hotspotObject;				
				if(parentPano[parentPano.length-1].panotype=="videopano") //panotype is videopano
				{
					/*var iconImage = "icons/next.png";
					if(type=="toPano")
					{
						iconImage = "icons/next.png";
					}
					
					else if(type=="link")
					{
						iconImage = "icons/link-icon.png";
					}
					
					else if(type=="video")
					{
						iconImage = "icons/video-icon.png";
					}
					
					var hotspotGeometry = new THREE.SphereGeometry(30, 60, 40);					
					var hotspotTexture = THREE.ImageUtils.loadTexture(iconImage); 					
					hotspotTexture.wrapS = hotspotTexture.wrapT = THREE.ClampToEdgeWrapping; 
					hotspotTexture.repeat.set(1, 1);
					var hotspotMaterial = new THREE.MeshBasicMaterial({map: hotspotTexture});
					hotspot = new THREE.Mesh(hotspotGeometry, hotspotMaterial);
					
					if(thumbnail!=null)
					{
						iconImage = thumbnail;
						hotspotGeometry = new THREE.BoxGeometry(1, 1, 1);					
						hotspotTexture = THREE.ImageUtils.loadTexture(iconImage); 					
						hotspotTexture.wrapS = hotspotTexture.wrapT = THREE.ClampToEdgeWrapping; 
						hotspotTexture.repeat.set(1, 1);					
						hotspotMaterial = new THREE.MeshBasicMaterial({map: hotspotTexture});
						hotspot = new THREE.Mesh(hotspotGeometry, hotspotMaterial);	
					}*/
				
					//constant rotation values for simplicity. 
					hotspotObject = [
						{
							hotspotMarker: hotspot,
							hotspotType: type,
							hotspotParentPano: parentPano,
							hotspotX: x,
							hotspotY: y,
							hotspotZ: z,
							hotspotRX: rx,
							hotspotRY: ry,
							hotspotRZ: rz,
							hotspotValue: value,
							hotspotTransition: transition,
							hotspotThumbnail: thumbnail
						}
					];
					//console.log(hotspotObject);
				}
				
				else if(parentPano[parentPano.length-1].panotype=="equirectangularpano") //panotype is equirectangularpano
				{
					/*var iconImage = "icons/next.png";
					if(type=="toPano")
					{
						iconImage = "icons/next.png";
					}
					
					else if(type=="link")
					{
						iconImage = "icons/link-icon.png";
					}
					
					else if(type=="video")
					{
						iconImage = "icons/video-icon.png";
					}
					
					var hotspotGeometry = new THREE.SphereGeometry(10, 100, 100);					
					var hotspotTexture = THREE.ImageUtils.loadTexture(iconImage); 					
					hotspotTexture.wrapS = hotspotTexture.wrapT = THREE.ClampToEdgeWrapping; 
					hotspotTexture.repeat.set(1, 1);
					var hotspotMaterial = new THREE.MeshBasicMaterial({map: hotspotTexture});
					hotspot = new THREE.Mesh(hotspotGeometry, hotspotMaterial);
					
					if(thumbnail!=null)
					{
						iconImage = thumbnail;
						hotspotGeometry = new THREE.BoxGeometry(20, 20, 0);					
						hotspotTexture = THREE.ImageUtils.loadTexture(iconImage); 
						hotspotTexture.wrapS = hotspotTexture.wrapT = THREE.ClampToEdgeWrapping; 
						hotspotTexture.repeat.set(1, 1);					
						hotspotMaterial = new THREE.MeshBasicMaterial({map: hotspotTexture});
						hotspot = new THREE.Mesh(hotspotGeometry, hotspotMaterial);	
					} else {
					}*/
				
					//constant rotation values for simplicity. 
					hotspotObject = [
						{
							hotspotMarker: hotspot,
							hotspotType: type,
							hotspotParentPano: parentPano,
							hotspotX: x/5,
							hotspotY: y/5,
							hotspotZ: z/5,
							hotspotRX: rx,
							hotspotRY: ry,
							hotspotRZ: rz,
							hotspotValue: value,
							hotspotTransition: transition,
							hotspotThumbnail: thumbnail
						}
					];
					//console.log(hotspotObject);
				}

				else //panotype is imagepano
				{
					/*var hotspotElement = document.createElement('img');				
					if(type=="toPano")
					{
						hotspotElement.src	= "icons/nextflipped.png";
					}
					
					else if(type=="link")
					{
						hotspotElement.src	= "icons/link-icon.png";
					}
					
					else if(type=="video")
					{
						hotspotElement.src	= "icons/video-icon.png";
					}
					
					if(thumbnail!=null)
					{
						hotspotElement.src	= thumbnail;
						hotspotElement.style.width = (selectorSize*10)+"px";
					}		
					hotspot = new THREE.CSS3DObject(hotspotElement);
					hotspot.scale.set(0.5, 0.5, 0.5);*/
					
					hotspotObject = [
						{
							hotspotMarker: hotspot,
							hotspotType: type,
							hotspotParentPano: parentPano,
							hotspotX: x,
							hotspotY: y,
							hotspotZ: z,
							hotspotRX: rx,
							hotspotRY: ry,
							hotspotRZ: rz,
							hotspotValue: value,
							hotspotTransition: transition,
							hotspotThumbnail: thumbnail
						}
					];						
					
				}
				hotspots.push(hotspotObject);
				return hotspotObject;
			}
			
			function createHotspotMarker(hotspotObject)
			{
				var hotspot;
				if(hotspotObject.hotspotParentPano[hotspotObject.hotspotParentPano.length-1].panotype=="videopano") //panotype is videopano
				{
					var iconImage = "icons/next.png";
					if(hotspotObject.hotspotType=="toPano")
					{
						iconImage = "icons/next.png";
					}
					
					else if(hotspotObject.hotspotType=="link")
					{
						iconImage = "icons/link-icon.png";
					}
					
					else if(hotspotObject.hotspotType=="video")
					{
						iconImage = "icons/video-icon.png";
					}
					
					var hotspotGeometry = new THREE.SphereGeometry(30, 60, 40);					
					var hotspotTexture = THREE.ImageUtils.loadTexture(iconImage); 					
					hotspotTexture.wrapS = hotspotTexture.wrapT = THREE.ClampToEdgeWrapping; 
					hotspotTexture.repeat.set(1, 1);
					var hotspotMaterial = new THREE.MeshBasicMaterial({map: hotspotTexture});
					hotspot = new THREE.Mesh(hotspotGeometry, hotspotMaterial);
					
					if(hotspotObject.hotspotThumbnail!=null)
					{
						iconImage = thumbnail;
						hotspotGeometry = new THREE.BoxGeometry(1, 1, 1);					
						hotspotTexture = THREE.ImageUtils.loadTexture(iconImage); 					
						hotspotTexture.wrapS = hotspotTexture.wrapT = THREE.ClampToEdgeWrapping; 
						hotspotTexture.repeat.set(1, 1);					
						hotspotMaterial = new THREE.MeshBasicMaterial({map: hotspotTexture});
						hotspot = new THREE.Mesh(hotspotGeometry, hotspotMaterial);	
					}
				}
				
				else if(hotspotObject.hotspotParentPano[hotspotObject.hotspotParentPano.length-1].panotype=="equirectangularpano") //panotype is equirectangularpano
				{
					var iconImage = "icons/next.png";
					if(hotspotObject.hotspotType=="toPano")
					{
						iconImage = "icons/next.png";
					}
					
					else if(hotspotObject.hotspotType=="link")
					{
						iconImage = "icons/link-icon.png";
					}
					
					else if(hotspotObject.hotspotType=="video")
					{
						iconImage = "icons/video-icon.png";
					}
					
					var hotspotGeometry = new THREE.SphereGeometry(10, 100, 100);					
					var hotspotTexture = THREE.ImageUtils.loadTexture(iconImage); 					
					hotspotTexture.wrapS = hotspotTexture.wrapT = THREE.ClampToEdgeWrapping; 
					hotspotTexture.repeat.set(1, 1);
					var hotspotMaterial = new THREE.MeshBasicMaterial({map: hotspotTexture});
					hotspot = new THREE.Mesh(hotspotGeometry, hotspotMaterial);
					
					if(hotspotObject.hotspotThumbnail!=null)
					{
						iconImage = thumbnail;
						hotspotGeometry = new THREE.BoxGeometry(20, 20, 0);					
						hotspotTexture = THREE.ImageUtils.loadTexture(iconImage); 
						hotspotTexture.wrapS = hotspotTexture.wrapT = THREE.ClampToEdgeWrapping; 
						hotspotTexture.repeat.set(1, 1);					
						hotspotMaterial = new THREE.MeshBasicMaterial({map: hotspotTexture});
						hotspot = new THREE.Mesh(hotspotGeometry, hotspotMaterial);	
					}
				}

				else //panotype is imagepano
				{
					var hotspotElement = document.createElement('img');				
					if(hotspotObject.hotspotType=="toPano")
					{
						hotspotElement.src	= "icons/nextflipped.png";
					}
					
					else if(hotspotObject.hotspotType=="link")
					{
						hotspotElement.src	= "icons/link-icon.png";
					}
					
					else if(hotspotObject.hotspotType=="video")
					{
						hotspotElement.src	= "icons/video-icon.png";
					}
					
					if(hotspotObject.hotspotThumbnail!=null)
					{
						hotspotElement.src	= hotspotObject.hotspotThumbnail;
						hotspotElement.style.width = (selectorSize*10)+"px";
					}		
					hotspot = new THREE.CSS3DObject(hotspotElement);
					hotspot.scale.set(0.5, 0.5, 0.5);
					
				}
				hotspotObject.hotspotMarker = hotspot
				return hotspot;
			}
			
			function renderHotspots(allHotspots)
			{
				for(var i=0;i<allHotspots.length;i++)
				{
					var hotspot = allHotspots[i][0];					
					//var marker = hotspot.hotspotMarker;
					var	parentPano = hotspot.hotspotParentPano;
					var	x = hotspot.hotspotX;
					var	y = hotspot.hotspotY;
					var	z = hotspot.hotspotZ;
					
					var rx = hotspot.hotspotRX;
					var ry = hotspot.hotspotRY;
					var rz = hotspot.hotspotRZ;
					
					if(parentPano[parentPano.length-1].isActive)
					{
						var marker = createHotspotMarker(hotspot);
						marker.position.set(x, y, z);
						marker.rotation.set(rx, ry, rz);
						scene.add(marker);
					}
				}
			}
			
			function triggerHotspots()
			{
				for(var i=0;i<hotspots.length;i++)
				{
					var hotspot = hotspots[i][0];

					var marker = hotspot.hotspotMarker;
					var	parentPano = hotspot.hotspotParentPano;
					
					if(parentPano[parentPano.length-1].isActive)
					{
						var	x = hotspot.hotspotX;
						var	y = hotspot.hotspotY;
						var	z = hotspot.hotspotZ;
						var type = hotspot.hotspotType;
						var value = hotspot.hotspotValue;
						var transition = hotspot.hotspotTransition;
						if (marker && marker.position) {
							var screenVector = marker.position.clone();
						screenVector.project( camera );
						screenVector.x = Math.round( (   screenVector.x + 1 ) * renderer.domElement.offsetWidth/2 );
						screenVector.y = Math.round( ( - screenVector.y + 1 ) * renderer.domElement.offsetHeight/2 );
						
						};
						
						var cameraLocalPosition = new THREE.Vector3( 0, 0, -1 );
						var cameraWorldPosition = cameraLocalPosition.applyMatrix4( camera.matrixWorld );
						var cameraDirection = cameraWorldPosition.sub( camera.position ).normalize();

						var selectorX = Math.round(renderer.domElement.offsetWidth/2);
						var selectorY = Math.round(renderer.domElement.offsetHeight/2);
						var xIntersect = Math.abs(screenVector.x - selectorX);
						var yIntersect = Math.abs(screenVector.y - selectorY);						
						var inCameraView = (marker.position.z<0 && cameraDirection.z<0) || (marker.position.z>0 && cameraDirection.z>0)?true:false;
						
						if(!tourVideoPlaying && !transitionVideoPlaying)
						{
							if(xIntersect<selectorSize && yIntersect<selectorSize && inCameraView)
							{
								animateSelector(selector);
								if(++triggerCount>150)
								{
									trigger = true;
									triggerCount=0;
								}
							}

							if(xIntersect>=selectorSize && yIntersect>=selectorSize && inCameraView)
							{
								triggerCount=0;
								selector.scale.set(1, 1, 1);
							}
						}
						
						else
						{
							//do nothing
						}
												
						if(trigger)
						{
							trigger = false;
							triggerCount=0;
							selector.scale.set(1, 1, 1);
							
							if(type == "toPano")
							{
								console.log("Loading pano");
								//console.log(value);
								loadTransitionAndRenderPano(transition, value);
							}
								
							else if(type == "link")
							{
								console.log("Opening link");
								window.location.href=value;
							}
							
							else if(type == "video")
							{
								if(transition==null)
								{
									console.log("Playing video");	
									tourAudio.pause();								
									tourVideo.src = value;
									tourVideo.style.width = window.innerWidth+"px";
									tourVideo.play();								
									tourVideoPlaying = true;
									document.body.insertBefore(tourVideo, document.body.firstChild);
									tourVideo.addEventListener('loadedmetadata', function() 
									{
										setTimeout(function()
										{
											tourVideo.pause();										
											for(var c = 0; c<document.body.childNodes.length; c++)
											{
												if(document.body.childNodes[c]==tourVideo)
												{
													document.body.removeChild(document.body.childNodes[c]);
												}
											}	
											
											tourVideoPlaying = false;
										}, tourVideo.duration*1000);
									});	
								}
								
								else	//this assumes only slide (and no image or video) transitions will be used
								{
									console.log("Loading start slide transition");	
									tourAudio.pause();								
									tourVideo.pause();								
									transitionVideoPlaying = true;								
									var startText = "", endText = "";
									var tempTransitionString = transition.substring(5, transition.length).split("+++");
									startText = tempTransitionString[0];
									if(tempTransitionString.length>1)
										endText = tempTransitionString[1];
									divText = startText;
									leftInterior.innerHTML = rightInterior.innerHTML = divText;
									document.body.insertBefore(stereoDiv, document.body.firstChild);
									var divTop = leftDiv.clientHeight - leftInterior.clientHeight;			
									leftInterior.style.top = rightInterior.style.top = divTop/2+"px";			
									setTimeout(function()
									{
										for(var c = 0; c<document.body.childNodes.length; c++)
										{
											if(document.body.childNodes[c]==stereoDiv)
											{
												document.body.removeChild(document.body.childNodes[c]);
											}
										}				
										transitionVideoPlaying = false;
										console.log("Start transition done. Now playing video...");
										tourVideo.src = value;
										tourVideo.style.width = window.innerWidth+"px";
										tourVideo.play();								
										tourVideoPlaying = true;
										document.body.insertBefore(tourVideo, document.body.firstChild);
										tourVideo.addEventListener('loadedmetadata', function() 
										{
											setTimeout(function()
											{
												tourVideo.pause();										
												for(var c = 0; c<document.body.childNodes.length; c++)
												{
													if(document.body.childNodes[c]==tourVideo)
													{
														document.body.removeChild(document.body.childNodes[c]);
													}
												}												
												tourVideoPlaying = false;
												if(endText!="")
												{
													console.log("Loading end slide transition");	
													tourAudio.pause();								
													tourVideo.pause();								
													transitionVideoPlaying = true;
													divText = endText;
													leftInterior.innerHTML = rightInterior.innerHTML = divText;
													document.body.insertBefore(stereoDiv, document.body.firstChild);
													var divTop = leftDiv.clientHeight - leftInterior.clientHeight;			
													leftInterior.style.top = rightInterior.style.top = divTop/2+"px";
													
													setTimeout(function()
													{
														for(var c = 0; c<document.body.childNodes.length; c++)
														{
															if(document.body.childNodes[c]==stereoDiv)
															{
																document.body.removeChild(document.body.childNodes[c]);
															}
														}				
														transitionVideoPlaying = false;
														console.log("End transition done. Now closing...");
													}, transitionImageDuration*1000);
												}
											}, tourVideo.duration*1000);
										});	
									}, transitionImageDuration*1000);
								}
							}
						}
								
						else
						{
							//console.log("No trigger");
						}
					}
					
					else
					{
						//do nothing
					}
				}
			}
			
			function loadTransitionAndRenderPano(transition, value)
			{
				if(transition==null)
				{
					console.log("No transition. Moving on to pano...");	
					renderPano(value);
				}
				
				else
				{	
					//if(transition.startsWith("Text:"))
					if(transition.indexOf("Text:")==0)
					{
						console.log("Loading slide transition");	
						tourAudio.pause();								
						tourVideo.pause();								
						transitionVideoPlaying = true;
						
						divText = transition.substring(5, transition.length);
						if(stereo) {
						leftInterior.innerHTML = rightInterior.innerHTML = divText;
						document.body.insertBefore(stereoDiv, document.body.firstChild);
						var divTop = leftDiv.clientHeight - leftInterior.clientHeight;			
						leftInterior.style.top = rightInterior.style.top = divTop/2+"px";
						} else {
							monoInterior.innerHTML = divText;
							document.body.insertBefore(monoDiv, document.body.firstChild);
							var divTop = monoDiv.clientHeight - monoInterior.clientHeight;
							monoInterior.style.top = divTop/2+"px";
						}
						setTimeout(function()
						{
							for(var c = 0; c<document.body.childNodes.length; c++)
							{
								if(stereo) {
									if(document.body.childNodes[c]==stereoDiv)
									{
										document.body.removeChild(document.body.childNodes[c]);
									}
								} else {
									if(document.body.childNodes[c]==monoDiv)
									{
										document.body.removeChild(document.body.childNodes[c]);
									}
								}
								
							}				
							transitionVideoPlaying = false;
							console.log("Transition done. Moving on to pano...");	
							renderPano(value);
						}, transitionImageDuration*1000);
					}
					
					else
					{
						var transitionString = transition.split(".");
						if(transitionString.length<=1)	//unknown transition type
						{
							console.log("Unknown transition type. Moving on to pano...");	
							renderPano(value);
						}
						
						else if(transitionString[1].toUpperCase()=="MP4")	//video transition
						{
							console.log("Loading video transition");	
							tourAudio.pause();								
							tourVideo.pause();								
							transitionVideo.src = transition;
							transitionVideo.style.width = window.innerWidth+"px";
							transitionVideo.play();								
							transitionVideoPlaying = true;	
							document.body.insertBefore(transitionVideo, document.body.firstChild);

							transitionVideo.addEventListener('loadedmetadata', function() 
							{
								setTimeout(function()
								{
									transitionVideo.pause();
									for(var c = 0; c<document.body.childNodes.length; c++)
									{
										if(document.body.childNodes[c]==transitionVideo)
										{
											document.body.removeChild(document.body.childNodes[c]);
										}
									}				
									transitionVideoPlaying = false;
									console.log("Transition done. Moving on to pano...");	
									renderPano(value);
								}, transitionVideo.duration*1000);
							});
						}
						
						else if(transitionString[1].toUpperCase()=="PNG" || transitionString[1].toUpperCase()=="JPG" || transitionString[1].toUpperCase()=="JPEG")	//image transition
						{
							console.log("Loading image transition");	
							tourAudio.pause();								
							tourVideo.pause();
							if(stereo) {
								leftImg.src = rightImg.src = transition;
								document.body.insertBefore(stereoImgDiv, document.body.firstChild);
								var divTop = leftImgDiv.clientHeight - leftImg.clientHeight;
								//leftImg.style.top = rightImg.style.top = divTop/2+"px";
							} else {
								transitionImage.src = transition;
								transitionImage.style.width = window.innerWidth+"px";
								transitionImage.style.height = window.innerHeight+"px";
							}
							transitionVideoPlaying = true;	
							document.body.insertBefore(transitionImage, document.body.firstChild);

							setTimeout(function()
							{
								for(var c = 0; c<document.body.childNodes.length; c++)
								{
									if(stereo) {
										if(document.body.childNodes[c]==stereoImgDiv)
										{
											document.body.removeChild(document.body.childNodes[c]);
										}
									} else {
										if(document.body.childNodes[c]==transitionImage)
										{
											document.body.removeChild(document.body.childNodes[c]);
										}
									}
								}				
								transitionVideoPlaying = false;
								console.log("Transition done. Moving on to pano...");	
								renderPano(value);
							}, transitionImageDuration*1000);
						}
						
						else
						{
							console.log("Cannot render transition. Moving on to pano...");	
							renderPano(value);
						}						
					}
				}
			}
			
			//function createPano(left, right, up, down, front, back, toRenderFirst, audioFile, type, description, latitude, longitude, name)
			function createPano(right, left, up, down, back, front, toRenderFirst, audioFile, type, description, latitude, longitude, name, rotation)
			{
				var pano = [
					{
						url: left,
						position: [ -512, 0, 0 ],
						rotation: [ 0, Math.PI / 2, 0 ]
					},
					{
						url: right,
						position: [ 512, 0, 0 ],
						rotation: [ 0, -Math.PI / 2, 0 ]
					},
					{
						url: up,
						position: [ 0,  512, 0 ],
						rotation: [ Math.PI / 2, 0, 0 ]
						//rotation: [ Math.PI / 2, 0, Math.PI ]
					},
					{
						url: down,
						position: [ 0, -512, 0 ],
						rotation: [ - Math.PI / 2, 0, 0 ]
						//rotation: [ - Math.PI / 2, 0, Math.PI ]
					},
					{
						url: front,
						position: [ 0, 0,  512 ],
						rotation: [ 0, Math.PI, 0 ]
					},
					{
						url: back,
						position: [ 0, 0, -512 ],
						rotation: [ 0, 0, 0 ]
					},
					{
						isActive: toRenderFirst,
						audio: audioFile,
						panotype: type,
						panoDescription: description,
						panoLat: latitude,
						panoLong: longitude,
						panoName: name,
						rotation: new THREE.Euler( rotation[0], rotation[1], rotation[2], 'XYZ' )
						//property: value,
					}
				];
				
				panoLocations.push(pano);
								
				if(toRenderFirst)
				{
					renderPano(pano);
					return pano;
				}
				
				else
				{
					return pano;
				}
			}
			
			function nextPano() {
				currentPano++;
				currentPano %= panoLocations.length;
				renderPano(panoLocations[currentPano]);
			}
			
			function previousPano() {
				currentPano--;
				if(currentPano < 0) currentPano = panoLocations.length-1;
				renderPano(panoLocations[currentPano]);
			}
			
			//function renderPano(pano, transition)
			function renderPano(pano)
			{
				clearScene();
				for(var i=0;i<panoLocations.length;i++)
				{
					var location = panoLocations[i];
					if(location[location.length-1].isActive == true)
					{
						previousLocation = location;
					}
					location[location.length-1].isActive = false;
					/*
					if(pano!=location)
					{
						location[location.length-1].isActive=false;
					}
					*/
					if(pano == location) {
						currentPano = i;
					}
				}
				
				pano[pano.length-1].isActive = true;
				var typeOfPano = pano[pano.length-1].panotype;
				var locationDescription = pano[pano.length-1].panoDescription;
				if(typeOfPano == "imagepano")
				{
					document.body.removeChild(renderer.domElement);
					if(stereo)
						renderer = new THREE.CSS3DStereoRenderer();
					else
						renderer = new THREE.CSS3DRenderer();
					renderer.setSize(window.innerWidth, window.innerHeight);
					document.body.appendChild(renderer.domElement);
					effect=null;
					//--------------------------------------
					camera.remove(selector);
					selector = new THREE.CSS3DObject( selectorElement );
					camera.add(selector);
					selector.position.set(0,0,-300);				
					
					camera.remove(exitSelector);
					exitSelector = new THREE.CSS3DObject( exitSelectorElement );
					camera.add(exitSelector);
					exitSelector.position.set(0,0,-300);
					//--------------------------------------
					inWorldDiv.innerHTML = locationDescription;
					var inWorldPanel = new THREE.CSS3DObject(inWorldDiv);
					inWorldPanel.position.set(0, 100,-300);
					camera.add(inWorldPanel);	
					setTimeout(function(){camera.remove(inWorldPanel);}, descriptionDuration*1000);					
					//---------------------------------------
					for ( var i = 0; i < 6; i ++ ) 
					{
						var panoSide = pano[i];
						var element = document.createElement('img');
						element.width = 1026; // 2 pixels extra to close the gap.
						element.src = panoSide.url;
						var face = new THREE.CSS3DObject(element);
						face.position.fromArray(panoSide.position);
						face.rotation.fromArray(panoSide.rotation);
						scene.add(face);
					}
				}

				else if(typeOfPano == "equirectangularpano")
				{
					document.body.removeChild(renderer.domElement);
					renderer = new THREE.WebGLRenderer();
					renderer.setSize(window.innerWidth, window.innerHeight);
					document.body.appendChild(renderer.domElement);
					if(stereo) {
						effect = new THREE.StereoEffect(renderer);
						//effect = new THREE.OculusRiftEffect(renderer);
						effect.setSize(window.innerWidth, window.innerHeight);
					} else {
						effect = null;
					}
					//-----------------------------
					var radius = window.innerWidth/450;
					var segments = 64;
					var circleGeometry = new THREE.CircleGeometry( radius, segments ); 
					circleGeometry.vertices.shift();
					
					camera.remove(selector);
					var selectorMaterial = new THREE.LineBasicMaterial({linewidth: 2, color: 0xffffff});	//or THREE.MeshBasicMaterial					
					selector = new THREE.Line( circleGeometry, selectorMaterial ); //or THREE.Mesh
					camera.add(selector);
					selector.position.set(0,0,-30);
									
					camera.remove(exitSelector);
					var exitSelectorMaterial = new THREE.LineBasicMaterial({linewidth: 1, color: 0xffcc00});	//or THREE.MeshBasicMaterial										
					exitSelector = new THREE.Line( circleGeometry, exitSelectorMaterial ); //or THREE.Mesh
					camera.add(exitSelector);
					exitSelector.position.set(0,0,-30);				
					//-----------------------------
					var panoSide = pano[0];
					//console.log(pano);
					var geometry = new THREE.SphereGeometry( 500, 60, 40 );
					geometry.applyMatrix( new THREE.Matrix4().makeScale( -1, 1, 1 ) );
					geometry.applyMatrix( new THREE.Matrix4().makeRotationFromEuler(pano[pano.length-1].rotation) );
					var texture = THREE.ImageUtils.loadTexture(panoSide.url);
					texture.minFilter = THREE.LinearFilter;
					var material   = new THREE.MeshBasicMaterial( { map : texture } );
					var videoMesh = new THREE.Mesh( geometry, material );
					scene.add(videoMesh);
				}
				
				else if(typeOfPano == "videopano")
				{
					document.body.removeChild(renderer.domElement);
					renderer = new THREE.WebGLRenderer();
					renderer.setSize(window.innerWidth, window.innerHeight);
					document.body.appendChild(renderer.domElement);
					if(stereo) {
						effect = new THREE.StereoEffect(renderer);
						//effect = new THREE.OculusRiftEffect(renderer);
						effect.setSize(window.innerWidth, window.innerHeight);
					} else {
						effect = null;
					}
					//-----------------------------
					var radius = window.innerWidth/450;
					var segments = 32;
					var circleGeometry = new THREE.CircleGeometry( radius, segments ); 
					circleGeometry.vertices.shift();
					
					camera.remove(selector);
					var selectorMaterial = new THREE.LineBasicMaterial({linewidth: 1, color: 0xffffff});	//or THREE.MeshBasicMaterial					
					selector = new THREE.Line( circleGeometry, selectorMaterial ); //or THREE.Mesh
					camera.add(selector);
					selector.position.set(0,0,-30);
									
					camera.remove(exitSelector);
					var exitSelectorMaterial = new THREE.LineBasicMaterial({linewidth: 1, color: 0xffcc00});	//or THREE.MeshBasicMaterial										
					exitSelector = new THREE.Line( circleGeometry, exitSelectorMaterial ); //or THREE.Mesh
					camera.add(exitSelector);
					exitSelector.position.set(0,0,-30);				
					//-----------------------------
					var panoSide = pano[0];
					var geometry = new THREE.SphereGeometry( 500, 60, 40 );
					geometry.applyMatrix( new THREE.Matrix4().makeScale( -1, 1, 1 ) );
					panoVideo.src = panoSide.url;
					panoVideo.setAttribute('crossorigin', 'anonymous');
					panoVideo.play();
					//console.log(panoVideo);
					var texture = new THREE.VideoTexture(panoVideo);
					texture.minFilter = THREE.LinearFilter;
					texture.magFilter = THREE.LinearFilter;
					texture.format = THREE.RGBFormat;
					texture.type = THREE.UnsignedByteType;
					var material   = new THREE.MeshBasicMaterial( { map : texture } );
					var videoMesh = new THREE.Mesh( geometry, material );
					scene.add(videoMesh);
				}
				
				else
				{
					document.body.removeChild(renderer.domElement);
					if(stereo)
						renderer = new THREE.CSS3DStereoRenderer();
					else
						renderer = new THREE.CSS3DRenderer();
					renderer.setSize(window.innerWidth, window.innerHeight);
					document.body.appendChild(renderer.domElement);
					effect=null;
					//--------------------------------------
					camera.remove(selector);
					selector = new THREE.CSS3DObject( selectorElement );
					camera.add(selector);
					selector.position.set(0,0,-300);				
					
					camera.remove(exitSelector);
					exitSelector = new THREE.CSS3DObject( exitSelectorElement );
					camera.add(exitSelector);
					exitSelector.position.set(0,0,-300);
					//--------------------------------------
					inWorldDiv.innerHTML = locationDescription;
					var inWorldPanel = new THREE.CSS3DObject(inWorldDiv);
					inWorldPanel.position.set(0, 100,-300);
					camera.add(inWorldPanel);	
					setTimeout(function(){camera.remove(inWorldPanel);}, descriptionDuration*1000);	
					//---------------------------------------				
					for ( var i = 0; i < 6; i ++ ) 
					{
						var panoSide = pano[i];
						var element = document.createElement('img');
						element.width = 1026; // 2 pixels extra to close the gap.
						element.src = panoSide.url;
						var face = new THREE.CSS3DObject(element);
						face.position.fromArray(panoSide.position);
						face.rotation.fromArray(panoSide.rotation);
						scene.add(face);
					}
				}
							
				if(pano[pano.length-1].audio!=null)
				{
					tourAudio.src = pano[pano.length-1].audio;
					tourAudio.load();	
					tourVideo.pause();
					if(typeOfPano!="videopano")
						panoVideo.pause();
					tourAudio.play();
					if(automaticNavigation)
					{
						tourAudio.addEventListener('loadedmetadata', function() 
						{
							audioDuration = tourAudio.duration;
							if(timeoutFunction!=null)
							{
								//clearTimeout(timeoutFunction);
								clearRequestTimeout(timeoutFunction);
							}							
							//timeoutFunction	= setTimeout(function()
							timeoutFunction	= requestTimeout(function()
							{
								var nextTransitionAndLocation = getNextTransitionAndLocation();
								//loadTransitionAndRenderPano(nextTransitionAndLocation[0], nextTransitionAndLocation[1]);
								if(!tourVideoPlaying && !transitionVideoPlaying)
								{
									loadTransitionAndRenderPano(nextTransitionAndLocation[0], nextTransitionAndLocation[1]);
								}
								else
								{
									//timeoutFunction;
								}								
							}, (audioDuration+3)*1000);
						});
					}
				}
				
				else
				{
					if(automaticNavigation)
					{
						audioDuration = defaultTransitionTime;
						if(timeoutFunction!=null)
						{
							//clearTimeout(timeoutFunction);
							clearRequestTimeout(timeoutFunction);
						}					
						//timeoutFunction = setTimeout(function()
						timeoutFunction = requestTimeout(function()
						{
							var nextTransitionAndLocation = getNextTransitionAndLocation();
							//loadTransitionAndRenderPano(nextTransitionAndLocation[0], nextTransitionAndLocation[1]);
							if(!tourVideoPlaying && !transitionVideoPlaying)
							{
								loadTransitionAndRenderPano(nextTransitionAndLocation[0], nextTransitionAndLocation[1]);
							}
							else
							{
								//timeoutFunction;
							}			
						}, audioDuration*1000);
					}
				}
				renderHotspots(hotspots);
				//console.log(scene);
			}
			
			function getNextTransitionAndLocation()
			{
				var value = start;
				var transition = null;
			   
			   for(var i=0;i<hotspots.length;i++)
			   {
					var hotspot = hotspots[i][0];					
					var marker = hotspot.hotspotMarker;
					var	parentPano = hotspot.hotspotParentPano;
					var type = hotspot.hotspotType;
					if(parentPano[parentPano.length-1].isActive && type=="toPano")
					{
						value = hotspot.hotspotValue;
						transition = hotspot.hotspotTransition;
					}
					
					else
					{
						//do nothing
					}
				}
				return new Array(transition, value);
			}
			
			function checkLocation()
			{
				var geolocationOptions = {enableHighAccuracy:true, maximumAge:0, timeout:10000};
				if (navigator.geolocation) 
				{
					navigator.geolocation.getCurrentPosition(onGeolocationSuccess, onGeolocationError, geolocationOptions);
				}			
				else 
				{
					//alert("Cannot detect your location. Please ensure that your location services are turned on");
					var inWorldMessage = "Cannot detect your location. Please ensure that your location services are turned on";
					inWorldMessageHolder.innerHTML = inWorldMessage;
					var inWorldMessagePanel = new THREE.CSS3DObject(inWorldMessageHolder);
					inWorldMessagePanel.position.set(0, 100,-300);
					if(++errorMessageCounter>=errorInterval)
					{
						errorMessageCounter=0;
						camera.add(inWorldMessagePanel);									
						setTimeout(function()
						{
							camera.remove(inWorldMessagePanel);
						}, inWorldMessageDuration*1000);
					}
				}
			}
			
			function onGeolocationSuccess(position)
			{
				var userLat = position.coords.latitude;
				var userLong = position.coords.longitude;
				var lastKnownUserLat = localStorage.getItem("lastKnownUserLat");
				var lastKnownUserLong = localStorage.getItem("lastKnownUserLong");
				console.log(userLat+", "+userLong);
				
				if(!locationInRange(userLat, userLong, lastKnownUserLat, lastKnownUserLong, distanceErrorAllowance))	//user has moved more than distanceErrorAllowance metres
				{
					console.log("User has moved");
					var location, locationLat, locationLong, locationName;
					for(var i=0;i<panoLocations.length;i++)
					{
						location = panoLocations[i];
						locationLat = location[location.length-1].panoLat;
						locationLong = location[location.length-1].panoLong;
						locationName = location[location.length-1].panoName;
											
						//check userLat and userLong against location's lat and long
						if(locationInRange(userLat, userLong, locationLat, locationLong, distanceErrorAllowance))	//user location falls within range of site
						{
							if(location[location.length-1].isActive != true)	//user is not currently at this location
							{
								console.log("Going to: "+locationName);
								closeLocationExists = true;
								break;									
							}
							
							else	//user is currently at this location
							{
								//do nothing
								console.log("User's current location: "+locationName);
								closeLocationExists = false;
							}
						}
						
						else	//user location does not fall within range of site
						{
							//do nothing
							console.log("No site in range: "+locationName);
							closeLocationExists = false;
						}
					}
					
					if(closeLocationExists)
					{
						var inWorldMessage = "New location detected. Going to: "+locationName;
						inWorldMessageHolder.innerHTML = inWorldMessage;
						var inWorldMessagePanel = new THREE.CSS3DObject(inWorldMessageHolder);
						inWorldMessagePanel.position.set(0, 100,-300);
						camera.add(inWorldMessagePanel);									
						setTimeout(function()
						{
							camera.remove(inWorldMessagePanel);
							renderPano(location);
						}, inWorldMessageDuration*1000);	//take user there
					}
					localStorage.setItem("lastKnownUserLat", userLat);
					localStorage.setItem("lastKnownUserLong", userLong);
				}
				
				else
				{
					console.log("User has not moved");
					//do nothing
				}
			}

			function onGeolocationError(err)
			{
				//alert("Error getting your location. Please ensure that location services are turned on and try again");
				var inWorldMessage = "Error getting your location. Please ensure that location services are turned on and try again";
				inWorldMessageHolder.innerHTML = inWorldMessage;
				var inWorldMessagePanel = new THREE.CSS3DObject(inWorldMessageHolder);
				inWorldMessagePanel.position.set(0, 100,-300);
				if(++errorMessageCounter>=errorInterval)
				{
					errorMessageCounter=0;
					camera.add(inWorldMessagePanel);									
					setTimeout(function()
					{
						camera.remove(inWorldMessagePanel);
					}, inWorldMessageDuration*1000);
				}
			}
			
			function locationInRange(aLat, aLong, bLat, bLong, distance) 
			{
				var ky = 40000 / 360;
				var kx = Math.cos(Math.PI * bLat / 180.0) * ky;
				var dx = Math.abs(bLong - aLong) * kx;
				var dy = Math.abs(bLat - aLat) * ky;
				return Math.sqrt(dx * dx + dy * dy) <= (distance/1000);
			}
					
			//--------------------------------------------------------------------------------------------------------			
			// requestAnimationFrame() shim by Paul Irish
			// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
			window.requestAnimFrame = (function() {
				return  window.requestAnimationFrame       || 
						window.webkitRequestAnimationFrame || 
						window.mozRequestAnimationFrame    || 
						window.oRequestAnimationFrame      || 
						window.msRequestAnimationFrame     || 
						function(/* function */ callback, /* DOMElement */ element){
							window.setTimeout(callback, 1000 / 60);
						};
			})();
			
			/*
			 * Behaves the same as setTimeout except uses requestAnimationFrame() where possible for better performance
			 * @param {function} fn The callback function
			 * @param {int} delay The delay in milliseconds
			 */
			window.requestTimeout = function(fn, delay) 
			{
				if( !window.requestAnimationFrame      	&& 
					!window.webkitRequestAnimationFrame && 
					!(window.mozRequestAnimationFrame && window.mozCancelRequestAnimationFrame) && // Firefox 5 ships without cancel support
					!window.oRequestAnimationFrame      && 
					!window.msRequestAnimationFrame)
						return window.setTimeout(fn, delay);
						
				var start = new Date().getTime(),
					handle = new Object();
					
				function loop(){
					var current = new Date().getTime(),
						delta = current - start;
						
					delta >= delay ? fn.call() : handle.value = requestAnimFrame(loop);
				};
				
				handle.value = requestAnimFrame(loop);
				return handle;
			};
			 
			/*
			 * Behaves the same as clearTimeout except uses cancelRequestAnimationFrame() where possible for better performance
			 * @param {int|object} fn The callback function
			 */
			window.clearRequestTimeout = function(handle) {
				window.cancelAnimationFrame ? window.cancelAnimationFrame(handle.value) :
				window.webkitCancelAnimationFrame ? window.webkitCancelAnimationFrame(handle.value) :
				window.webkitCancelRequestAnimationFrame ? window.webkitCancelRequestAnimationFrame(handle.value) : /* Support for legacy API */
				window.mozCancelRequestAnimationFrame ? window.mozCancelRequestAnimationFrame(handle.value) :
				window.oCancelRequestAnimationFrame	? window.oCancelRequestAnimationFrame(handle.value) :
				window.msCancelRequestAnimationFrame ? window.msCancelRequestAnimationFrame(handle.value) :
				clearTimeout(handle);
			};

			/*
			 * Behaves the same as setInterval except uses requestAnimationFrame() where possible for better performance
			 * @param {function} fn The callback function
			 * @param {int} delay The delay in milliseconds
			 */
			window.requestInterval = function(fn, delay) {
				if( !window.requestAnimationFrame       && 
					!window.webkitRequestAnimationFrame && 
					!(window.mozRequestAnimationFrame && window.mozCancelRequestAnimationFrame) && // Firefox 5 ships without cancel support
					!window.oRequestAnimationFrame      && 
					!window.msRequestAnimationFrame)
						return window.setInterval(fn, delay);
						
				var start = new Date().getTime(),
					handle = new Object();
					
				function loop() {
					var current = new Date().getTime(),
						delta = current - start;
						
					if(delta >= delay) {
						fn.call();
						start = new Date().getTime();
					}

					handle.value = requestAnimFrame(loop);
				};
				
				handle.value = requestAnimFrame(loop);
				return handle;
			}

			/*
			 * Behaves the same as clearInterval except uses cancelRequestAnimationFrame() where possible for better performance
			 * @param {int|object} fn The callback function
			 */
				window.clearRequestInterval = function(handle) {
				window.cancelAnimationFrame ? window.cancelAnimationFrame(handle.value) :
				window.webkitCancelAnimationFrame ? window.webkitCancelAnimationFrame(handle.value) :
				window.webkitCancelRequestAnimationFrame ? window.webkitCancelRequestAnimationFrame(handle.value) : /* Support for legacy API */
				window.mozCancelRequestAnimationFrame ? window.mozCancelRequestAnimationFrame(handle.value) :
				window.oCancelRequestAnimationFrame	? window.oCancelRequestAnimationFrame(handle.value) :
				window.msCancelRequestAnimationFrame ? window.msCancelRequestAnimationFrame(handle.value) :
				clearInterval(handle);
			};

			//---------------------------------------------
			function onWindowResize() 
			{
				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();
				renderer.setSize( window.innerWidth, window.innerHeight );
				
				if(effect!=null)
				{
					effect.setSize(window.innerWidth, window.innerHeight);
				}
			}

			function onDocumentMouseDown( event ) 
			{
				event.preventDefault();
				document.addEventListener( 'mousemove', onDocumentMouseMove, false );
				document.addEventListener( 'mouseup', onDocumentMouseUp, false );
			}

			function onDocumentMouseMove( event ) 
			{
				var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
				var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;
				lon -= movementX * 0.1;
				lat += movementY * 0.1;
			}

			function onDocumentMouseUp( event ) 
			{
				document.removeEventListener( 'mousemove', onDocumentMouseMove );
				document.removeEventListener( 'mouseup', onDocumentMouseUp );
			}

			function onDocumentMouseWheel( event ) 
			{
				camera.fov -= event.wheelDeltaY * 0.05;
				camera.updateProjectionMatrix();
			}

			function onDocumentTouchStart( event ) 
			{
				event.preventDefault();
				var touch = event.touches[ 0 ];
				touchX = touch.screenX;
				touchY = touch.screenY;
			}

			function onDocumentTouchMove( event ) 
			{
				event.preventDefault();
				var touch = event.touches[ 0 ];
				lon -= ( touch.screenX - touchX ) * 0.1;
				lat += ( touch.screenY - touchY ) * 0.1;
				touchX = touch.screenX;
				touchY = touch.screenY;
			}
