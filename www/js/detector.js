
var deviceType='mobile';

//This tests whether the viewing device is Mobile or not. It is declared here to make it accessible
//all through the app
var isMobile = 
{
	Android: function() {
		return navigator.userAgent.match(/Android/i);
	},
	BlackBerry: function() {
		return navigator.userAgent.match(/BlackBerry|PlayBook|BB/i);
	},
	iOS: function() {
		return navigator.userAgent.match(/iPhone|iPad|iPod/i);
	},
	Opera: function() {
		return navigator.userAgent.match(/Opera Mini/i);
	},
	Windows: function() {
		return navigator.userAgent.match(/IEMobile|Windows Phone/i);
	},
	WebOS: function() {
		return navigator.userAgent.match(/webOS/i);
	},
	Kindle: function() {
		return navigator.userAgent.match(/Kindle/i);
	},
	Silk: function() {
		return navigator.userAgent.match(/Silk/i);
	},
	any: function() {
		return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows() || isMobile.WebOS() || isMobile.Kindle() || isMobile.Silk());
	}
};
									
if(isMobile.any())	//Mobile
{
	deviceType='mobile';
}

else	//not mobile
{
	deviceType='pc';
}		
		
//the device detector method runs on load		
window.addEventListener('load', function(e) 
{		
	var isMobile = 
	{
		Android: function() {
			return navigator.userAgent.match(/Android/i);
		},
		BlackBerry: function() {
			return navigator.userAgent.match(/BlackBerry|PlayBook|BB/i);
		},
		iOS: function() {
			return navigator.userAgent.match(/iPhone|iPad|iPod/i);
		},
		Opera: function() {
			return navigator.userAgent.match(/Opera Mini/i);
		},
		Windows: function() {
			return navigator.userAgent.match(/IEMobile|Windows Phone/i);
		},
		WebOS: function() {
			return navigator.userAgent.match(/webOS/i);
		},
		Kindle: function() {
			return navigator.userAgent.match(/Kindle/i);
		},
		Silk: function() {
			return navigator.userAgent.match(/Silk/i);
		},
		any: function() {
			return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows() || isMobile.WebOS() || isMobile.Kindle() || isMobile.Silk());
		}
	};
										
	if(isMobile.any())	//Mobile
	{
		deviceType='mobile';
	}

	else	//not mobile
	{
		deviceType='pc';
	}	
	
}, false);
		
		
window.addEventListener('load', function(e) 
{	
	window.applicationCache.abort();
	
	if(isMobile.any())	//Mobile, check connection type before attempting to cache
	{
		if(navigator.connection.type==Connection.WIFI) //connection is wifi, proceed to cache
		{
			window.applicationCache.update();
		}
				
		else if(navigator.connection.type==Connection.CELL_2G || navigator.connection.type==Connection.CELL_3G || navigator.connection.type==Connection.CELL_4G || navigator.connection.type==Connection.CELL)	//connection is 2g/3g/4g, ask user
		{					
			if(window.localStorage.getItem('downloadOverCell')==null)
			{
				if(confirm('A cellular network has been detected. Enable App download data for offline use over your cellular network?'))	//user wants to proceed, proceed to cache
				{
					window.localStorage.setItem('downloadOverCell', 'true');
					window.applicationCache.update();
				}
							
				else	//user does not wish to proceed...
				{
					//caching process remains aborted
					window.localStorage.setItem('downloadOverCell', 'false');
				}
			}
				
			else
			{
				if(window.localStorage.getItem('downloadOverCell')=='true')
				{
					window.applicationCache.update();
				}
							
				else if(window.localStorage.getItem('downloadOverCell')=='false')
				{
					//caching process remains aborted
				}
			}
		}
				
		else	//connection is unknown, Ethernet, or none. Attempt to cache anyway
		{
			window.applicationCache.update();
		}
	}

	else	//not mobile hence pc, user would most likely be using wifi, proceed as normal
	{
		//window.applicationCache.update();
	}
			
	//if caching process every updates, this happens...
	window.applicationCache.addEventListener('updateready', function(e) 
	{
		if (window.applicationCache.status == window.applicationCache.UPDATEREADY) // Device downloaded a new app cache
		{
			window.applicationCache.swapCache();
			if (confirm('New contents are available. Load contents?')) 
			{
				window.location.reload();
			}
						
			else
			{
				//Contents will be loaded when page is reloaded anyway
			}
		} 
		
		else 
		{
			// Manifest didn't change. Nothing new on server.
		}
	}, false);			
	
}, false);
		
		
document.addEventListener("online", function()
{
	if(navigator.connection.type==Connection.WIFI)
	{
		window.applicationCache.update();
	}
	
	if(navigator.onLine)
	{
		if(window.localStorage.getItem('deviceOnline')!='true')
		{
			$.modaldialog.warning("Switching to online mode...");
			window.localStorage.setItem('deviceOnline', 'true');
		}
		
		else
		{
		
		}
	}
});

/*
document.addEventListener("offline", function()
{
	if(!navigator.onLine)
	{
		if(window.localStorage.getItem('deviceOnline')!='false')
		{
			$.modaldialog.warning("No connection found. Switching to offline mode...");
			window.localStorage.setItem('deviceOnline', 'false');
		}
		
		else
		{
		
		}
	}
});*/
