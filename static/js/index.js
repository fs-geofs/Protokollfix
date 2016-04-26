var LSMT = (function() {
  var codemirror, baseURL;

  /**
   * @desc saves the current document to the server
   * @param type: String 'template', 'snippet' or 'document'. default: 'document'
   */
  function save(type) {
    var dateString, fileName, data;

    dateString = new Date().toISOString().slice(0, 10).replace(/-+/g, '_');

    var promptTitle = 'Please enter a filename!';
    // ask for a filename
    if (type == 'template')
      fileName = prompt('SAVE TEMPLATE\n' + promptTitle);
    else if (type == 'snippet')
      fileName = prompt('SAVE SNIPPET\n' + promptTitle);
    else if (/\/document/.test(window.location.pathname))
      fileName = decodeURIComponent(window.location.pathname.replace(baseURL + '/document/', ''));
    else if (/\/template/.test(window.location.pathname))
      fileName = prompt('SAVE DOCUMENT\n' + promptTitle, dateString + '_' +
      decodeURIComponent(window.location.pathname.replace(baseURL + '/template/', '')));
    else
      fileName = prompt('SAVE DOCUMENT\n' + promptTitle);

    // stop invalid filename or user has canceld
    if (!fileName) return;

    // ensure we save with .md extension
    if (fileName.split('.').pop() !== 'md') fileName += '.md';

    data = {
      name: encodeURIComponent(fileName),
      markdown: codemirror.getValue(),
      type: type || 'document'
    };

    $.post(baseURL + '/save', data, function(res) {
      if (res.saved && type === 'snippet') window.location = baseURL + '/';
      else if (res.saved) window.location = res.saved;
    });
  }

  /**
   * @desc opens a mailto link containing the document
   * @param type: 'html' or 'markdown'
   */
  function mail(type) {
    var content, mailtoLink = 'mailto:?to=&body=';
    if (type === 'html')
      content = $('#html-preview').html();
    else if (type === 'markdown')
      content = codemirror.getValue();

    if (!content) return;
    mailtoLink += encodeURIComponent(content);
    window.location = mailtoLink;
  }

  /**
   * @desc shows & hides the editor
   */
  function toggleViewMode() {
    var btnTxt = $('#btn-mode').html();

    if (btnTxt.indexOf('view') === -1) {
      btnTxt = btnTxt.replace('edit', 'view').replace('pencil', 'blackboard');
      window.location.hash = '';
    } else {
      btnTxt = btnTxt.replace('view', 'edit').replace('blackboard', 'pencil');
      window.location.hash = 'viewmode';
    }

    $('#btn-mode').html(btnTxt);
    $('#rightcolumn').toggleClass('fullheight col-sm-6 col-sm-12');
    $('#leftcolumn').toggleClass('hidden');
    $('#btn-help').toggleClass('hidden');
    $('#menu-templates').toggleClass('hidden');
    $('#menu-snippets').toggleClass('hidden');
    $('#menu-save').toggleClass('hidden');
  }

  /**
   * @desc inserts a textsnippet at the current editor selection
   * @path filename of the snippet
   */
  function insertSnippet(path) {
    $.get(baseURL + '/snippet/' + encodeURIComponent(path), function(data) {
      codemirror.replaceSelection(data);
    });
  }

  /**
   * @desc parses the current content of the editor to markdown.
   *       if it begins with a yaml metadata header, it is parsed first
   */
  function parseInput() {
      var yamlParsed, title, content, text = codemirror.getValue();

      // loadFront() may fail, so we need to catch that
      try {
        yamlParsed = jsyaml.loadFront(text);
        title = '<h1>' + (yamlParsed.title || '') + '</h1>';
        content = title + marked(yamlParsed.__content);
        // replaces [ ] and [x] after bullet points with checkbox unicode characters
        content = content.replace(/^- \[ \]/gm, "- &#9744;").replace(/^- \[x\]/gm, "- &#9745;");
        $('#html-preview').html(content);
      } catch (e) {
        $('#html-preview').html(marked(text));
      }
  }

  $(document).ready(function() {
    baseURL = $('#baseurl').html();
    marked.setOptions({ pedantic: true });

    codemirror = CodeMirror.fromTextArea($('#md-textarea')[0], {
      mode: 'gfm',
      lineWrapping: true,
      autofocus: true,
      extraKeys: {
        'Ctrl-S': function(cm) { save(); },
        'Ctrl-N': function(cm) { window.location = baseURL; }
      }
    });

    codemirror.on('change', parseInput);

    parseInput(); // initially populate the preview

    // start in view mode, if we have a device with one-column view or its specified in the url hash
    if($(window).width() < 767 || window.location.hash == '#viewmode')
      toggleViewMode();
  });

  return {
    save: save,
    insertSnippet: insertSnippet,
    toggleViewMode: toggleViewMode
  };
})();
