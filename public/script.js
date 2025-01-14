function decodeJWT(token) {
	if (!token) return null;
	try {
		const payloadBase64 = token.split('.')[1];
		const decodedPayload = JSON.parse(atob(payloadBase64)); // Decodes the token
		return decodedPayload;
	}
	catch (error) {
		console.log(error)
		return null
	}
}

function goToLogin() {
	const jwt = localStorage.getItem("jwt");
	const decodedToken = decodeJWT(jwt);

	if (decodedToken && decodedToken.exp * 1000 > Date.now()) {
		window.location.href = "/dashboard";
	}
	else {
		window.location.href = "/login";
	}

}

const statusDiv = document.getElementById("status");

let clicked = false;

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/dashboard') {
		dashboard();
	}

	if (window.location.pathname === '/plan') {
		planSelect();
	}
});

function dashboard() {

	const lastGen = localStorage.getItem("genId");
	if (lastGen) {
		pollStatus(lastGen)
	}

	const jwt = localStorage.getItem("jwt")
	const decodedToken = decodeJWT(jwt);

	if (!decodedToken) {
		window.location.href = "/login"
	}

	if (decodedToken.subscription == "pro") {
		document.getElementById("pro").style.display = "none";
		document.getElementById("watermark").disabled = false;
		document.getElementById("n").disabled = false;
	}

	const input = document.getElementById("n")
	input.addEventListener("input", () => {

		let value = parseFloat(input.value);
	
		if (value < 1) {
		  input.value = 1;
		} else if (value > 5) {
		  input.value = 5;
		} else if (!Number.isInteger(value)) {
		  input.value = Math.round(value); // Corrects to nearest integer
		}
	});


	document.getElementById("start").addEventListener('click', async () => {

		if (clicked) {
			return
		}
	
		clicked = true;
		setTimeout(() => {
			clicked = false;
		}, 5000);

		clearInterval(interval);
	
		const url = document.getElementById("url").value;
		const n = document.getElementById("n").value;
		let watermark = true;
		if (document.getElementById("watermark").checked) {
			watermark = false;
		}

		console.log("N is", n)
	
		const response = await fetch('/generate', {
			method: 'POST',
			body: JSON.stringify({
				url: url,
				n: n,
				jwt: jwt,
				watermark: watermark
			}),
			headers: {
				'Content-Type': 'application/json',
			}
		});
	
		const data = await response.json();
	
		if (data.success) {
			statusDiv.innerText = "Clip generation has started."
			const genId = data.genId;
			localStorage.setItem("genId", genId)
			pollStatus(genId)
		}
		else {
			statusDiv.innerText = "Clip generation has failed."
		}
	
	});

	document.getElementById("logout").addEventListener("click", () => {
		localStorage.removeItem("jwt");
		window.location.href = "/";
	})

}

let interval;

async function pollStatus(genId) {
	interval = setInterval(async () => {
		
		const response = await fetch('/status', {
			method: 'POST',
			body: JSON.stringify({
				genId: genId
			}),
			headers: {
				'Content-Type': 'application/json',
			}
		});

		const data = await response.json();
		const genData = data.genData

		statusDiv.innerText = `Status: ${genData.status}`;
		console.log(statusDiv.innerText);

		console.log(genData)

		const clips = genData.clips;

		console.log(clips)

		if (!clips) {
			return
		}

		for (const clipName in clips) {
			if (clips[clipName] != "Finished") {
				statusDiv.innerHTML += `<p>${clipName}: ${clips[clipName]}</p>`
			}
			else {
				statusDiv.innerHTML += `<p>${clipName}: <a class="coloredLink" href="/download/${clipName}">Download</a></p>`
			}
			
			console.log(statusDiv.innerText);
		}

		if (genData.status == "Finished" || genData.status =="Failed") {
			clearInterval(interval)
			localStorage.removeItem("genId")
		}


	  }, 5000);
}


//Login system
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

const loginBtn = document.getElementById("login");
if (loginBtn) {
  loginBtn.addEventListener('click', () => {

    loginBtn.innerText = "Please wait..."
  
    const email = document.getElementById("username").value;
    const password = document.getElementById("password").value;

  
    fetch('/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: email,
        password: password
      }),
      headers: { 'Content-Type': 'application/json' }
    }).then(response => response.json())
      .then((data) => {
        console.log('Success:', data)

          if (data.success) {
            const token = data.token;
            // Store the token in chrome.storage
            localStorage.setItem('jwt', token);
            window.location.href = "/dashboard";
          }
          else {
            document.getElementById("error-message").innerText = data.message;
            loginBtn.innerText = "Login"
          }
          
      })
      .catch((error) => {
        document.getElementById("error-message").innerText = "Login error";
        loginBtn.innerText = "Login"
        console.error('Error:', error)
      });
  
});
} 

const registerBtn = document.getElementById("register");
if (registerBtn) {
  registerBtn.addEventListener('click', () => {

    const email = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const passwordAgain = document.getElementById("passwordAgain").value;
    const errorMessage = document.getElementById("error-message")
    const ref = localStorage.getItem("ref");

    if (!validateEmail(email)) {
      errorMessage.innerText = "Invalid email address"
    }
    else if (password.length < 5) {
      errorMessage.innerText = "Password too short"
    }
    else if (password != passwordAgain) {
      errorMessage.innerText = "Passwords must match"
    }
    else {

      registerBtn.innerText = "Please wait..."
  
      fetch("/register", {
        method: 'POST',
        body: JSON.stringify({ 
          email: email,
          password: password,
          ref: ref
        }),
        headers: { 'Content-Type': 'application/json' }
      }).then(response => response.json())
        .then((data) => {
          console.log('Success:', data)
            
            if (data.success) {
              // Store the token in chrome.storage
              const token = data.token;
              localStorage.setItem('jwt', token);
              window.location.href = "/dashboard";
            }
            else {
              errorMessage.innerText = data.message;
              registerBtn.innerText = "Register"
            }
            
        })
        .catch((error) => {
          errorMessage.innerText = data.message;
          registerBtn.innerText = "Register";
          console.error('Error:', error);
        });
    }
  
  });
  
}

function planSelect() {
	const token = localStorage.getItem("jwt")
    const decodedToken = decodeJWT(token)

	
	if (!decodedToken) {
		window.location.href = "/login";
		return
	}

	const url = new URL(window.location.href);
	const params = new URLSearchParams(url.search);
	if (params.has('session_id')) {
		const sessionId = params.get('session_id');

		fetch('/add-subscription', {
			method: 'POST',
			body: JSON.stringify({
				sessionId: sessionId
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		})
			.then(response => response.json())
			.then(data => {
				console.log(data);
				
				if (data.success) {
					localStorage.setItem("jwt", data.token)
					window.location.href = window.location.origin + window.location.pathname;
					return
				}

				if (!data.success) {
					document.getElementById("errorText").innerText = "Failed to add subscription. Please contact support!";
				}
				
				
			})
			.catch(error => console.error('Error:', error));

	}
	
	const currentSub = decodedToken.subscription;
	const currentSubCapital = currentSub.charAt(0).toUpperCase() + currentSub.slice(1);

	document.getElementById("yourPlan").innerText = `Your current plan is: ${currentSubCapital}`;


	document.getElementById("checkout").addEventListener('click', async () => {
		const email = decodedToken.email;
		console.log(email)
	
		fetch('/create-checkout-session', {
			method: 'POST',
			body: JSON.stringify({
				email: email
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		})
			.then(response => response.json())
			.then(session => {
				console.log(session)
				if (session.success) {
					if (session.updated) {
						console.log("JWT updated")
						localStorage.setItem("jwt", session.token)
						window.location.href = window.location.origin + window.location.pathname;
						return
					}

					if (session.url) {
						console.log("Redirecting")
						window.location.href = session.url
						return
					}
					
				}
				
				document.getElementById("errorText").innerText = session.error;
				
			})
			.catch(error => console.error('Error:', error));
	});

	document.getElementById("cancel").addEventListener('click', async () => {
		const email = decodedToken.email;
		console.log(email)
	
		fetch('/cancel-subscription', {
			method: 'POST',
			body: JSON.stringify({
				email: email
			}),
			headers: {
				'Content-Type': 'application/json',
			},
		})
			.then(response => response.json())
			.then(data => {

				if (data.success) {
					localStorage.setItem("jwt", data.token)
					window.location.href = window.location.origin + window.location.pathname;
					return
				}

				document.getElementById("errorText").innerText = data.error;
			})
			.catch(error => console.error('Error:', error));
	});



}

const logos = document.getElementsByClassName("logo")

for (const logo of logos) {
	logo.addEventListener("click", () => {
		console.log(clicked);
		window.location.href = "/";
	})
}

if (window.location.pathname == "/privacy" || window.location.pathname == "/tos") {
	const div = document.querySelector('#content');
	const text = div.textContent;
	div.innerHTML = text.replace(/\n/g, '<br>');
}