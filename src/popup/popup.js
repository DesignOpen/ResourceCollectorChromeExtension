var app = {

  /**
   * Runs each time page loads
   */
  init: function() {
    var that = this;
    this.checkPastSubmission(function(hasPastSubmission, submission) {
      if(hasPastSubmission) {
        that.submissionInfoInit.call(that, submission);
      } else {
        that.submissionFormInit.call(that);
      }
    });
  },

  /**
   * Initializes the submission form
   */
  submissionFormInit: function() {
    var that = this;
    document.getElementById('submissionLoading').style.display = 'none';
    document.getElementById('submissionInfo').style.display = 'none';
    document.getElementById('submissionForm').style.display = 'block';
    this.populateCategories();
    this.populatePageInfo();
    this.populateTwitterHandle();
    document.getElementById('submit').addEventListener('click', function() {
      that.processForm.call(that);
    });
  },

  /**
   * Initializes the thank you page
   */
  submissionInfoInit: function(submission) {
    document.getElementById('submissionLoading').style.display = 'none';
    document.getElementById('submissionForm').style.display = 'none';
    document.getElementById('submissionInfo').style.display = 'block';
    document.getElementById('viewSubmission').addEventListener('click', function() {
      chrome.tabs.create({url: submission.issueUrl});
    });
  },

  /**
   * Checks if the current active tab has a past
   * submission. If current URL has past submission,
   * callback is executed with true as the first param
   * and the submission data as the second param.
   */
  checkPastSubmission: function(callback) {
    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
      chrome.storage.sync.get({sites: new Object()}, function(items) {
        if(items.sites[tabs[0].url]){
          callback(true, items.sites[tabs[0].url]);
        } else {
          callback(false, null);
        }
      });
    });
  },

  /**
   * Retrieves list of categories from Design Open
   * and populates form field
   */
  populateCategories: function() {
    var categoryEl = document.getElementById('category');
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        var resp = xhr.responseText;
        // Transform JSONP into JSON
        resp = resp.replace(/^\s*functionCall\(\s*/, '{ "categories":')
                   .replace(/\s*\);\s*$/,'}')
                   .replace(/,\s*\]/g, "]")
                   .replace(/\n/g, "");
        resp = JSON.parse(resp).categories;
        categoryEl.innerHTML = '';
        categoryEl.disabled = false;
        resp.forEach(function(category) {
          var optionEl = document.createElement("option");
          optionEl.text = category;
          categoryEl.add(optionEl);
        });
      }
    };
    xhr.open('GET', 'http://designopen.org/categories.js', true);
    xhr.send();
  },

  /**
   * Populates form fields with information from
   * active Chrome tab
   */
  populatePageInfo: function() {
    var titleEl = document.getElementById('title');
    var urlEl = document.getElementById('url');
    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
      titleEl.value = tabs[0].title;
      urlEl.value = tabs[0].url;
    });
  },

  /**
   * Populates Twitter handle from Chrome storage API
   */
  populateTwitterHandle: function() {
    chrome.storage.sync.get({twitter: ''}, function(items) {
      document.getElementById('twitter').value = items.twitter;
    });
  },

  /**
   * Runs each time form is submitted
   */
  processForm: function() {
    var that = this;
    var submitEl = document.getElementById('submit');
    var errStatusEl = document.getElementById('errStatus');
    submitEl.disabled = true;
    errStatusEl.innerHTML = '';
    chrome.storage.sync.set({twitter: document.getElementById('twitter').value});
    var data = {
      title: document.getElementById('title').value,
      URL: document.getElementById('url').value,
      twitter: document.getElementById('twitter').value,
      description: document.getElementById('description').value,
      category: document.getElementById('category').value
    };
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 4) {
        console.log();
        var resp = JSON.parse(xhr.responseText);
        if(resp.success) {
          chrome.storage.sync.get({sites: new Object()}, function(items) {
            var sites = items.sites;
            sites[data.URL] = {
              submitted: new Date(),
              issueNum: resp.issue,
              issueUrl: resp.url,
              data: data
            };
            chrome.storage.sync.set({sites: sites});
            that.submissionInfoInit(sites[data.URL]);
          });
        } else {
          submitEl.disabled = false;
          errStatusEl.innerHTML = 'ERROR: ' + resp.error;
        }
      }
    };
    xhr.open('POST', 'http://osdrc.herokuapp.com/api/resource', true);
    xhr.setRequestHeader('Content-type', 'application/json');
    xhr.send(JSON.stringify(data));
  }

};

app.init();