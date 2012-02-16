//
// multimarkdown.js -- A javascript port of MultiMarkdown.
//
// Showdown Copyright: (c) 2007 John Fraser.
//
// Original Markdown Copyright (c) 2004-2005 John Gruber
//   <http://daringfireball.net/projects/markdown/>
//
// Redistributable under a BSD-style open source license.
//

//
// Wherever possible, multimarkdown.js is a straight, line-by-line port
// of the Perl version of MultiMarkdown.
//

//
// Showdown usage:
//
//   var text = "Markdown *rocks*.";
//
//   var converter = new Showdown.converter();
//   var html = converter.makeHtml(text);
//
//   alert(html);
//
// Note: move the sample code to the bottom of this
// file before uncommenting it.
//

//
// Showdown namespace
//
var Showdown = {};

//
// converter
//
// Wraps all "globals" so that the only thing
// exposed is makeHtml().
//
Showdown.converter = function() {

//
// Global default settings:
//

var g_empty_element_suffix = " />";
var g_tab_width = 4;
var g_allow_mathml = 1;
var g_base_header_level = 1;

//
// Globals:
//

// Global hashes, used by various utility routines
var g_urls;
var g_titles;
var g_html_blocks;

var g_urls;
var g_titles;
var g_html_blocks;
var g_metadata;
var g_metadata_newline;
var g_crossrefs;
var g_footnotes;
var g_attributes;
var g_used_footnotes;
var g_footnote_counter = 0;

var g_citation_counter = 0;
var g_used_references;
var g_references;
g_bibliography_title = "Bibliography";

g_use_metadata = 1;
g_metadata_newline = {'default' : '\n', 'keywords' : ', '};

var g_document_format = "";

var g_list_level = 0;

// Used to track when we're inside an ordered or unordered list
// (see _ProcessListItems() for details):
var g_list_level = 0;


this.makeHtml = function(text) {
//
// Main function. The order in which other subs are called here is
// essential. Link and image substitutions need to happen before
// _EscapeSpecialCharsWithinTagAttributes(), so that any *'s or _'s in the <a>
// and <img> tags get encoded.
//

    // Clear the global hashes. If we don't clear these, you get conflicts
    // from other articles when generating a page which contains more than
    // one article (e.g. an index page that shows the N most recent
    // articles):
    g_urls = new Array();
    g_titles = new Array();
    g_html_blocks = new Array();
    g_metadata = new Array();
    g_crossrefs = new Array();
    g_footnotes = new Array();
    g_used_footnotes = new Array();
    g_footnote_counter = 0;
    g_used_references = new Array();
    g_references = new Array();
    g_citation_counter = 0;
    g_attributes = new Array();


    // attacklab: Replace ~ with ~T
    // This lets us use tilde as an escape char to avoid md5 hashes
    // The choice of character is arbitray; anything that isn't
    // magic in Markdown will work.
    text = text.replace(/~/g,"~T");

    // attacklab: Replace $ with ~D
    // RegExp interprets $ as a special character
    // when it's in a replacement string
    text = text.replace(/\$/g,"~D");

    // Standardize line endings
    text = text.replace(/\r\n/g,"\n"); // DOS to Unix
    text = text.replace(/\r/g,"\n"); // Mac to Unix


    // Old Markdown: Make sure text begins and ends with a couple of newlines:
    // TODO See why this is the case (it will cause problem when processing meta tags
    // text = "\n\n" + text + "\n\n";

    // Convert all tabs to spaces.
    text = _Detab(text);

    // Strip any lines consisting only of spaces and tabs.
    // This makes subsequent regexen easier to write, because we can
    // match consecutive blank lines with /\n+/ instead of something
    // contorted like /[ \t]*\n+/ .
    text = text.replace(/^[ \t]+$/mg,"");

    // Strip out MetaData

    if (g_use_metadata) {
        text = _ParseMetaData(text); // Done.  TODO check
    }


    // And recheck for leading blank lines
    text = text.replace(XRegExp("/^\n+/", "s"),""); 

    // Turn block-level HTML blocks into hash entries
    text = _HashHTMLBlocks(text);

    // Strip footnote and link definitions, store in hashes.

    text = _StripFootnoteDefinitions(text); // TODO

    text = _StripLinkDefinitions(text);

    _GenerateImageCrossRefs(text); // TODO

    text = _StripMarkdownReferences(text); // TODO
    
    text = _RunBlockGamut(text);

    text = _DoMarkdownCitations(text); // TODO

    text = _DoFootnotes(text); // TODO

    text = _UnescapeSpecialChars(text);

    // Clean encoding within HTML comments

    text = _UnescapeComments(text); // TODO

    text = _FixFootnoteParagraphs(text); // TODO

    text += _PrintFootnotes(); // TODO

    text += _PrintMarkdownBibliography(); // TODO

    text = _ConvertCopyright(text); // TODO

    // attacklab: Restore dollar signs
    text = text.replace(/~D/g,"$$");

    // attacklab: Restore tildes
    text = text.replace(/~T/g,"~");

    // TODO
//    if (lc($g_document_format) =~ /^complete\s*$/i) {
//      return xhtmlMetaData() . "<body>\n\n" . $text . "\n</body>\n</html>";
//  } elsif (lc($g_document_format) =~ /^snippet\s*$/i) {
//      return $text . "\n";
//  } else {
//      return $g_document_format . textMetaData() . $text . "\n";
//  }

    return text;
}


var _ParseMetaData = function(text) { // TODO
    //    my $text = shift;
    //  my $clean_text = "";
    var clean_text = "";
    //  my ($inMetaData, $currentKey) = (1,'');
    var inMetaData = true;
    var currentKey = "";
    //  
    //  If only metadata is "Format: complete" then skip
    //  
    var r_formatComplete = new XRegExp("^(Format):\\s*complete\n(.*?)\n", "is"); // TODO check if this usage is correct
    if (r_formatComplete.test(text)) {
        // If "Format: complete" was added automatically, don't force first 
        // line of text to be metadata
        text.replace(r_formatComplete, function($0, $1, $2) {
            g_metadata[$1] = "complete";
            g_document_format = "complete";
        });
    }

    var lines = text.split(/\n/);
    //console.log(lines);
    for (var i in lines) {
        var line = lines[i];
        if (line.match(/^$/)) {
            inMetaData = false;
        }
        if (inMetaData) {
            //console.log('has meta data');
            r_meta = /^([a-zA-Z0-9][0-9a-zA-Z _-]*?):\s*(.*)$/;
            if (line.match(r_meta)) {
                line.replace(r_meta, function($0, $1, $2) {
                    currentKey = $1;
                    var meta = $2;
                    currentKey = currentKey.replace(/\s+/g, ' ');
                    currentKey = currentKey.replace(/\s$/, '');
                    g_metadata[currentKey] = meta;
                    lc_currentKey = currentKey.toLowerCase();
                    if (lc_currentKey == "format") {
                        g_document_format = g_metadata[currentKey].toLowerCase();
                    }
                    if (lc_currentKey == "base url") {
                        g_base_url = g_metadata[currentKey];
                    }
                    if (lc_currentKey == "bibliography title") {
                        g_bibliography_title = g_metadata[currentKey];
                        g_bibliography_title = g_bibliography_title.replace(/\s*$/, '');
                    }
                    if (lc_currentKey == "base header level") {
                        g_base_header_level = g_metadata[currentKey];
                    }
                    if (!(currentKey in g_metadata_newline)) {
                        g_metadata_newline[currentKey] = g_metadata_newline['default'];
                    }
                });
            } else {
                if (currentKey == "") {
                    // No metadata present
                    clean_text += line + "\n";
                    inMetaData = false;
                    continue;
                }
                if (line.match(/^\s*(.+)$/)) {
                    line.replace(/^\s*(.+)$/, function ($0, $1) {
                        g_metadata[currentKey] += g_metadata_newline[currentKey] + $1;
                    });
                }
            }
        } else {
            clean_text += line + "\n";
        }
    }

    //console.log(g_metadata);

    return clean_text;
}

var _StripFootnoteDefinitions = function(text) { // TODO
    var less_than_tab = g_tab_width - 1;
    var r_footnote = new XRegExp(
            "\n[ ]{0,}" + less_than_tab + "}\\[\\^([^\n]+?)\\]\\:[ \t]*" + // id = $1
            "\n?" + 
            "(.*?)\n{1,2}" + // end at new paragraph
            "((?=\n[ ]{0,}" + less_than_tab + "}\\S)|\\Z)" // Look ahead for non-space at line-start, or end of doc
        , "sx");
    
    while (r_footnote.test(text)) {
        text = text.replace(r_footnote, function($0, $1, $2) {
            var id = $1;
            var footnote = $2 + "\n";
            footnote = footnote.replace(new XRegExp("^[ ]{0," + g_tab_width + "}", "gm"), '');
            g_footnotes[id2footnote(id)] = footnote;
            return '';
        });
    }

    return text;
}

var id2footnote = function(id) {
    var footnote = id.toLowerCase();
    footnote = footnote.replace(/[^A-Za-z0-9:_.-]/g, '');
    return footnote;
}

var _GenerateImageCrossRefs = function() { // TODO

}

var _StripMarkdownReferences = function(text) { // TODO
    return text;
}

var _DoMarkdownCitations = function(text) { // TODO
    return text;
}

var _DoFootnotes = function(text) { // TODO
    return text;
}

var _UnescapeComments = function(text) { // TODO
    return text;
}

var _FixFootnoteParagraphs = function(text) { // TODO
    return text;
}

var _PrintFootnotes = function() { // TODO
    return '';
}

var _PrintMarkdownBibliography = function() { // TODO
    return '';
}

var _ConvertCopyright = function(text) { // TODO
    return text;
}

var _StripLinkDefinitions = function(text) {
//
// Strips link definitions from text, stores the URLs and titles in
// hash references.
//
    
    var less_than_tab = g_tab_width - 1;

    var r_link = new XRegExp( // TODO this yields an error of invalid group
            // Pattern altered for Multimarkdown
            // in order to not match citations or footnotes
            "^[ ]{0," + less_than_tab + "}\\[([#].*)\\]:" + // id = $1
            "[ \\t]*" + 
            "\\n?" + // maybe *one* new line
            "[ \\t]*" +
            "<?(\\S+?)>?" + // url = $2
            "[ \\t]*\\n?[ \\t]*" + 
            "(?:" +
            //"(?<=\\s)" + // look behind for whitespace; js/xregexp does not support lookbehind
            "[\"(]" + 
            "(.+?)" + // title = $3
            "[\")]" + 
            "[ \\t]*" +
            ")?" + // title is optional
            // MultiMarkdown addition for attribute support
            "\\n?" + 
            "(" + // Attributes = $4
            //"(?<=\s)" + // look behind for whitespace
            "(([ \\t]*\\n)?[ \\t]*((\\S+=\\S+)|(\\S+=\".*?\")))*" +
            ")?" + 
            "[ \\t]*" + 
            // /addition
            "(?:\\n+|\\Z)"
        , "mx");


    // Link defs are in the form: ^[id]: url "optional title"

    /*
        var text = text.replace(/
                ^[ ]{0,3}\[(.+)\]:  // id = $1  attacklab: g_tab_width - 1
                  [ \t]*
                  \n?               // maybe *one* newline
                  [ \t]*
                <?(\S+?)>?          // url = $2
                  [ \t]*
                  \n?               // maybe one newline
                  [ \t]*
                (?:
                  (\n*)             // any lines skipped = $3 attacklab: lookbehind removed
                  ["(]
                  (.+?)             // title = $4
                  [")]
                  [ \t]*
                )?                  // title is optional
                (?:\n+|$)
              /gm,
              function(){...});
    */
    var text = text.replace(/^[ ]{0,3}\[(.+)\]:[ \t]*\n?[ \t]*<?(\S+?)>?[ \t]*\n?[ \t]*(?:(\n*)["(](.+?)[")][ \t]*)?(?:\n+|\Z)/gm,
        function (wholeMatch,m1,m2,m3,m4) {
            m1 = m1.toLowerCase();
            g_urls[m1] = _EncodeAmpsAndAngles(m2);  // Link IDs are case-insensitive
            if (m3) {
                // Oops, found blank lines, so it's not a title.
                // Put back the parenthetical statement we stole.
                return m3+m4;
            } else if (m4) {
                g_titles[m1] = m4.replace(/"/g,"&quot;");
            }
            
            // Completely remove the definition from the text
            return "";
        }
    );

    return text;
}


var _HashHTMLBlocks = function(text) {
    // attacklab: Double up blank lines to reduce lookaround
    text = text.replace(/\n/g,"\n\n");

    // Hashify HTML blocks:
    // We only want to do this for block-level HTML tags, such as headers,
    // lists, and tables. That's because we still want to wrap <p>s around
    // "paragraphs" that are wrapped in non-block-level tags, such as anchors,
    // phrase emphasis, and spans. The list of tags we're looking for is
    // hard-coded:
    // MultiMarkdown does not include `math` in the above list so that 
    // Equations can optionally be included in separate paragraphs
    var block_tags_a = "p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|ins|del"
    var block_tags_b = "p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe"

    // First, look for nested blocks, e.g.:
    //   <div>
    //     <div>
    //     tags for inner block must be indented.
    //     </div>
    //   </div>
    //
    // The outermost tags must start at the left margin for this to match, and
    // the inner nested divs must be indented.
    // We need to do this before the next, more liberal match, because the next
    // match will start at the first `<div>` and stop at the first `</div>`.

    // attacklab: This regex can be expensive when it fails.
    /*
        var text = text.replace(/
        (                       // save in $1
            ^                   // start of line  (with /m)
            <($block_tags_a)    // start tag = $2
            \b                  // word break
                                // attacklab: hack around khtml/pcre bug...
            [^\r]*?\n           // any number of lines, minimally matching
            </\2>               // the matching end tag
            [ \t]*              // trailing spaces/tabs
            (?=\n+)             // followed by a newline
        )                       // attacklab: there are sentinel newlines at end of document
        /gm,function(){...}};
    */
    text = text.replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|ins|del)\b[^\r]*?\n<\/\2>[ \t]*(?=\n+))/gm,hashElement);

    //
    // Now match more liberally, simply from `\n<tag>` to `</tag>\n`
    //

    /*
        var text = text.replace(/
        (                       // save in $1
            ^                   // start of line  (with /m)
            <($block_tags_b)    // start tag = $2
            \b                  // word break
                                // attacklab: hack around khtml/pcre bug...
            [^\r]*?             // any number of lines, minimally matching
            .*</\2>             // the matching end tag
            [ \t]*              // trailing spaces/tabs
            (?=\n+)             // followed by a newline
        )                       // attacklab: there are sentinel newlines at end of document
        /gm,function(){...}};
    */
    text = text.replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math)\b[^\r]*?.*<\/\2>[ \t]*(?=\n+)\n)/gm,hashElement);

    // Special case just for <hr />. It was easier to make a special case than
    // to make the other regex more complicated.  

    /*
        text = text.replace(/
        (                       // save in $1
            \n\n                // Starting after a blank line
            [ ]{0,3}
            (<(hr)              // start tag = $2
            \b                  // word break
            ([^<>])*?           // 
            \/?>)               // the matching end tag
            [ \t]*
            (?=\n{2,})          // followed by a blank line
        )
        /g,hashElement);
    */
    text = text.replace(/(\n[ ]{0,3}(<(hr)\b([^<>])*?\/?>)[ \t]*(?=\n{2,}))/g,hashElement);

    // Special case for standalone HTML comments:

    /*
        text = text.replace(/
        (                       // save in $1
            \n\n                // Starting after a blank line
            [ ]{0,3}            // attacklab: g_tab_width - 1
            <!
            (--[^\r]*?--\s*)+
            >
            [ \t]*
            (?=\n{2,})          // followed by a blank line
        )
        /g,hashElement);
    */
    text = text.replace(/(\n\n[ ]{0,3}<!(--[^\r]*?--\s*)+>[ \t]*(?=\n{2,}))/g,hashElement);

    // PHP and ASP-style processor instructions (<?...?> and <%...%>)

    /*
        text = text.replace(/
        (?:
            \n\n                // Starting after a blank line
        )
        (                       // save in $1
            [ ]{0,3}            // attacklab: g_tab_width - 1
            (?:
                <([?%])         // $2
                [^\r]*?
                \2>
            )
            [ \t]*
            (?=\n{2,})          // followed by a blank line
        )
        /g,hashElement);
    */
    text = text.replace(/(?:\n\n)([ ]{0,3}(?:<([?%])[^\r]*?\2>)[ \t]*(?=\n{2,}))/g,hashElement);

    // attacklab: Undo double lines (see comment at top of this function)
    text = text.replace(/\n\n/g,"\n");
    return text;
}

var hashElement = function(wholeMatch,m1) {
    var blockText = m1;

    // Undo double lines
    blockText = blockText.replace(/\n\n/g,"\n");
    blockText = blockText.replace(/^\n/,"");
    
    // strip trailing blank lines
    blockText = blockText.replace(/\n+$/g,"");
    
    // Replace the element text with a marker ("~KxK" where x is its key)
    blockText = "\n\n~K" + (g_html_blocks.push(blockText)-1) + "K\n\n";
    
    return blockText;
};

var _RunBlockGamut = function(text) {
//
// These are all the transformations that form block-level
// tags like paragraphs, headers, and list items.
//
    text = _DoHeaders(text);

    // Do Horizontal Rules:
    var key = hashBlock("<hr />");
    text = text.replace(/^[ ]{0,2}([ ]?\*[ ]?){3,}[ \t]*$/gm,key);
    text = text.replace(/^[ ]{0,2}([ ]?\-[ ]?){3,}[ \t]*$/gm,key);
    text = text.replace(/^[ ]{0,2}([ ]?\_[ ]?){3,}[ \t]*$/gm,key);

    text = _DoLists(text);
    text = _DoCodeBlocks(text);
    text = _DoBlockQuotes(text);

    // We already ran _HashHTMLBlocks() before, in Markdown(), but that
    // was to escape raw HTML in the original Markdown source. This time,
    // we're escaping the markup we've just created, so that we don't wrap
    // <p> tags around block-level tags.
    text = _HashHTMLBlocks(text);
    text = _FormParagraphs(text);

    return text;
}


var _RunSpanGamut = function(text) {
//
// These are all the transformations that occur *within* block-level
// tags like paragraphs, headers, and list items.
//

    text = _DoCodeSpans(text);
    text = _EscapeSpecialCharsWithinTagAttributes(text);
    text = _EncodeBackslashEscapes(text);

    // Process anchor and image tags. Images must come first,
    // because ![foo][f] looks like an anchor.
    text = _DoImages(text);
    text = _DoAnchors(text);

    // Make links out of things like `<http://example.com/>`
    // Must come after _DoAnchors(), because you can use < and >
    // delimiters in inline links like [this](<url>).
    text = _DoAutoLinks(text);
    text = _EncodeAmpsAndAngles(text);
    text = _DoItalicsAndBold(text);

    // Do hard breaks:
    text = text.replace(/  +\n/g," <br />\n");

    return text;
}

var _EscapeSpecialCharsWithinTagAttributes = function(text) {
//
// Within tags -- meaning between < and > -- encode [\ ` * _] so they
// don't conflict with their use in Markdown for code, italics and strong.
//

    // Build a regex to find HTML tags and comments.  See Friedl's 
    // "Mastering Regular Expressions", 2nd Ed., pp. 200-201.
    var regex = /(<[a-z\/!$]("[^"]*"|'[^']*'|[^'">])*>|<!(--.*?--\s*)+>)/gi;

    text = text.replace(regex, function(wholeMatch) {
        var tag = wholeMatch.replace(/(.)<\/?code>(?=.)/g,"$1`");
        tag = escapeCharacters(tag,"\\`*_");
        return tag;
    });

    return text;
}

var _DoAnchors = function(text) {
//
// Turn Markdown link shortcuts into XHTML <a> tags.
//
    //
    // First, handle reference-style links: [link text] [id]
    //

    /*
        text = text.replace(/
        (                           // wrap whole match in $1
            \[
            (
                (?:
                    \[[^\]]*\]      // allow brackets nested one level
                    |
                    [^\[]           // or anything else
                )*
            )
            \]

            [ ]?                    // one optional space
            (?:\n[ ]*)?             // one optional newline followed by spaces

            \[
            (.*?)                   // id = $3
            \]
        )()()()()                   // pad remaining backreferences
        /g,_DoAnchors_callback);
    */
    text = text.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g,writeAnchorTag);

    //
    // Next, inline-style links: [link text](url "optional title")
    //

    /*
        text = text.replace(/
            (                       // wrap whole match in $1
                \[
                (
                    (?:
                        \[[^\]]*\]  // allow brackets nested one level
                    |
                    [^\[\]]         // or anything else
                )
            )
            \]
            \(                      // literal paren
            [ \t]*
            ()                      // no id, so leave $3 empty
            <?(.*?)>?               // href = $4
            [ \t]*
            (                       // $5
                (['"])              // quote char = $6
                (.*?)               // Title = $7
                \6                  // matching quote
                [ \t]*              // ignore any spaces/tabs between closing quote and )
            )?                      // title is optional
            \)
        )
        /g,writeAnchorTag);
    */
    text = text.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\]\([ \t]*()<?(.*?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g,writeAnchorTag);

    //
    // Last, handle reference-style shortcuts: [link text]
    // These must come last in case you've also got [link test][1]
    // or [link test](/foo)
    //

    /*
        text = text.replace(/
        (                           // wrap whole match in $1
            \[
            ([^\[\]]+)              // link text = $2; can't contain '[' or ']'
            \]
        )()()()()()                 // pad rest of backreferences
        /g, writeAnchorTag);
    */
    text = text.replace(/(\[([^\[\]]+)\])()()()()()/g, writeAnchorTag);

    return text;
}

var writeAnchorTag = function(wholeMatch,m1,m2,m3,m4,m5,m6,m7) {
    if (m7 == undefined) m7 = "";
    var whole_match = m1;
    var link_text   = m2;
    var link_id  = m3.toLowerCase();
    var url     = m4;
    var title   = m7;
    
    if (url == "") {
        if (link_id == "") {
            // lower-case and turn embedded newlines into spaces
            link_id = link_text.toLowerCase().replace(/ ?\n/g," ");
        }
        url = "#"+link_id;
        
        if (g_urls[link_id] != undefined) {
            url = g_urls[link_id];
            if (g_titles[link_id] != undefined) {
                title = g_titles[link_id];
            }
        }
        else {
            if (whole_match.search(/\(\s*\)$/m)>-1) {
                // Special case for explicit empty url
                url = "";
            } else {
                return whole_match;
            }
        }
    }   
    
    url = escapeCharacters(url,"*_");
    var result = "<a href=\"" + url + "\"";
    
    if (title != "") {
        title = title.replace(/"/g,"&quot;");
        title = escapeCharacters(title,"*_");
        result +=  " title=\"" + title + "\"";
    }
    
    result += ">" + link_text + "</a>";
    
    return result;
}


var _DoImages = function(text) {
//
// Turn Markdown image shortcuts into <img> tags.
//

    //
    // First, handle reference-style labeled images: ![alt text][id]
    //

    /*
        text = text.replace(/
        (                       // wrap whole match in $1
            !\[
            (.*?)               // alt text = $2
            \]

            [ ]?                // one optional space
            (?:\n[ ]*)?         // one optional newline followed by spaces

            \[
            (.*?)               // id = $3
            \]
        )()()()()               // pad rest of backreferences
        /g,writeImageTag);
    */
    text = text.replace(/(!\[(.*?)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g,writeImageTag);

    //
    // Next, handle inline images:  ![alt text](url "optional title")
    // Don't forget: encode * and _

    /*
        text = text.replace(/
        (                       // wrap whole match in $1
            !\[
            (.*?)               // alt text = $2
            \]
            \s?                 // One optional whitespace character
            \(                  // literal paren
            [ \t]*
            ()                  // no id, so leave $3 empty
            <?(\S+?)>?          // src url = $4
            [ \t]*
            (                   // $5
                (['"])          // quote char = $6
                (.*?)           // title = $7
                \6              // matching quote
                [ \t]*
            )?                  // title is optional
        \)
        )
        /g,writeImageTag);
    */
    text = text.replace(/(!\[(.*?)\]\s?\([ \t]*()<?(\S+?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g,writeImageTag);

    return text;
}

var writeImageTag = function(wholeMatch,m1,m2,m3,m4,m5,m6,m7) {
    var whole_match = m1;
    var alt_text   = m2;
    var link_id  = m3.toLowerCase();
    var url     = m4;
    var title   = m7;

    if (!title) title = "";
    
    if (url == "") {
        if (link_id == "") {
            // lower-case and turn embedded newlines into spaces
            link_id = alt_text.toLowerCase().replace(/ ?\n/g," ");
        }
        url = "#"+link_id;
        
        if (g_urls[link_id] != undefined) {
            url = g_urls[link_id];
            if (g_titles[link_id] != undefined) {
                title = g_titles[link_id];
            }
        }
        else {
            return whole_match;
        }
    }   
    
    alt_text = alt_text.replace(/"/g,"&quot;");
    url = escapeCharacters(url,"*_");
    var result = "<img src=\"" + url + "\" alt=\"" + alt_text + "\"";

    // attacklab: Markdown.pl adds empty title attributes to images.
    // Replicate this bug.

    //if (title != "") {
        title = title.replace(/"/g,"&quot;");
        title = escapeCharacters(title,"*_");
        result +=  " title=\"" + title + "\"";
    //}
    
    result += " />";
    
    return result;
}


var _DoHeaders = function(text) {

    // Setext-style headers:
    //  Header 1
    //  ========
    //  
    //  Header 2
    //  --------
    //
    text = text.replace(/^(.+)[ \t]*\n=+[ \t]*\n+/gm,
        function(wholeMatch,m1){return hashBlock('<h1 id="' + headerId(m1) + '">' + _RunSpanGamut(m1) + "</h1>");});

    text = text.replace(/^(.+)[ \t]*\n-+[ \t]*\n+/gm,
        function(matchFound,m1){return hashBlock('<h2 id="' + headerId(m1) + '">' + _RunSpanGamut(m1) + "</h2>");});

    // atx-style headers:
    //  # Header 1
    //  ## Header 2
    //  ## Header 2 with closing hashes ##
    //  ...
    //  ###### Header 6
    //

    /*
        text = text.replace(/
            ^(\#{1,6})              // $1 = string of #'s
            [ \t]*
            (.+?)                   // $2 = Header text
            [ \t]*
            \#*                     // optional closing #'s (not counted)
            \n+
        /gm, function() {...});
    */

    text = text.replace(/^(\#{1,6})[ \t]*(.+?)[ \t]*\#*\n+/gm,
        function(wholeMatch,m1,m2) {
            var h_level = m1.length;
            return hashBlock("<h" + h_level + ' id="' + headerId(m2) + '">' + _RunSpanGamut(m2) + "</h" + h_level + ">");
        });

    function headerId(m) {
        return m.replace(/[^\w]/g, '').toLowerCase();
    }
    return text;
}

// This declaration keeps Dojo compressor from outputting garbage:
var _ProcessListItems;

var _DoLists = function(text) {
//
// Form HTML ordered (numbered) and unordered (bulleted) lists.
//

    // attacklab: add sentinel to hack around khtml/safari bug:
    // http://bugs.webkit.org/show_bug.cgi?id=11231
    text += "~0";

    // Re-usable pattern to match any entirel ul or ol list:

    /*
        var whole_list = /
        (                                   // $1 = whole list
            (                               // $2
                [ ]{0,3}                    // attacklab: g_tab_width - 1
                ([*+-]|\d+[.])              // $3 = first list item marker
                [ \t]+
            )
            [^\r]+?
            (                               // $4
                ~0                          // sentinel for workaround; should be $
            |
                \n{2,}
                (?=\S)
                (?!                         // Negative lookahead for another list item marker
                    [ \t]*
                    (?:[*+-]|\d+[.])[ \t]+
                )
            )
        )/g
    */
    var whole_list = /^(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(~0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm;

    if (g_list_level) {
        text = text.replace(whole_list,function(wholeMatch,m1,m2) {
            var list = m1;
            var list_type = (m2.search(/[*+-]/g)>-1) ? "ul" : "ol";

            // Turn double returns into triple returns, so that we can make a
            // paragraph for the last item in a list, if necessary:
            list = list.replace(/\n{2,}/g,"\n\n\n");;
            var result = _ProcessListItems(list);
    
            // Trim any trailing whitespace, to put the closing `</$list_type>`
            // up on the preceding line, to get it past the current stupid
            // HTML block parser. This is a hack to work around the terrible
            // hack that is the HTML block parser.
            result = result.replace(/\s+$/,"");
            result = "<"+list_type+">" + result + "</"+list_type+">\n";
            return result;
        });
    } else {
        whole_list = /(\n\n|^\n?)(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(~0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/g;
        text = text.replace(whole_list,function(wholeMatch,m1,m2,m3) {
            var runup = m1;
            var list = m2;

            var list_type = (m3.search(/[*+-]/g)>-1) ? "ul" : "ol";
            // Turn double returns into triple returns, so that we can make a
            // paragraph for the last item in a list, if necessary:
            var list = list.replace(/\n{2,}/g,"\n\n\n");;
            var result = _ProcessListItems(list);
            result = runup + "<"+list_type+">\n" + result + "</"+list_type+">\n";   
            return result;
        });
    }

    // attacklab: strip sentinel
    text = text.replace(/~0/,"");

    return text;
}

_ProcessListItems = function(list_str) {
//
//  Process the contents of a single ordered or unordered list, splitting it
//  into individual list items.
//
    // The $g_list_level global keeps track of when we're inside a list.
    // Each time we enter a list, we increment it; when we leave a list,
    // we decrement. If it's zero, we're not in a list anymore.
    //
    // We do this because when we're not inside a list, we want to treat
    // something like this:
    //
    //    I recommend upgrading to version
    //    8. Oops, now this line is treated
    //    as a sub-list.
    //
    // As a single paragraph, despite the fact that the second line starts
    // with a digit-period-space sequence.
    //
    // Whereas when we're inside a list (or sub-list), that line will be
    // treated as the start of a sub-list. What a kludge, huh? This is
    // an aspect of Markdown's syntax that's hard to parse perfectly
    // without resorting to mind-reading. Perhaps the solution is to
    // change the syntax rules such that sub-lists must start with a
    // starting cardinal number; e.g. "1." or "a.".

    g_list_level++;

    // trim trailing blank lines:
    list_str = list_str.replace(/\n{2,}$/,"\n");

    // attacklab: add sentinel to emulate \z
    list_str += "~0";

    /*
        list_str = list_str.replace(/
            (\n)?                           // leading line = $1
            (^[ \t]*)                       // leading whitespace = $2
            ([*+-]|\d+[.]) [ \t]+           // list marker = $3
            ([^\r]+?                        // list item text   = $4
            (\n{1,2}))
            (?= \n* (~0 | \2 ([*+-]|\d+[.]) [ \t]+))
        /gm, function(){...});
    */
    list_str = list_str.replace(/(\n)?(^[ \t]*)([*+-]|\d+[.])[ \t]+([^\r]+?(\n{1,2}))(?=\n*(~0|\2([*+-]|\d+[.])[ \t]+))/gm,
        function(wholeMatch,m1,m2,m3,m4){
            var item = m4;
            var leading_line = m1;
            var leading_space = m2;

            if (leading_line || (item.search(/\n{2,}/)>-1)) {
                item = _RunBlockGamut(_Outdent(item));
            }
            else {
                // Recursion for sub-lists:
                item = _DoLists(_Outdent(item));
                item = item.replace(/\n$/,""); // chomp(item)
                item = _RunSpanGamut(item);
            }

            return  "<li>" + item + "</li>\n";
        }
    );

    // attacklab: strip sentinel
    list_str = list_str.replace(/~0/g,"");

    g_list_level--;
    return list_str;
}


var _DoCodeBlocks = function(text) {
//
//  Process Markdown `<pre><code>` blocks.
//  

    /*
        text = text.replace(text,
            /(?:\n\n|^)
            (                               // $1 = the code block -- one or more lines, starting with a space/tab
                (?:
                    (?:[ ]{4}|\t)           // Lines must start with a tab or a tab-width of spaces - attacklab: g_tab_width
                    .*\n+
                )+
            )
            (\n*[ ]{0,3}[^ \t\n]|(?=~0))    // attacklab: g_tab_width
        /g,function(){...});
    */

    // attacklab: sentinel workarounds for lack of \A and \Z, safari\khtml bug
    text += "~0";
    
    text = text.replace(/(?:\n\n|^)((?:(?:[ ]{4}|\t).*\n+)+)(\n*[ ]{0,3}[^ \t\n]|(?=~0))/g,
        function(wholeMatch,m1,m2) {
            var codeblock = m1;
            var nextChar = m2;
        
            codeblock = _EncodeCode( _Outdent(codeblock));
            codeblock = _Detab(codeblock);
            codeblock = codeblock.replace(/^\n+/g,""); // trim leading newlines
            codeblock = codeblock.replace(/\n+$/g,""); // trim trailing whitespace

            codeblock = "<pre><code>" + codeblock + "\n</code></pre>";

            return hashBlock(codeblock) + nextChar;
        }
    );

    // attacklab: strip sentinel
    text = text.replace(/~0/,"");

    return text;
}

var hashBlock = function(text) {
    text = text.replace(/(^\n+|\n+$)/g,"");
    return "\n\n~K" + (g_html_blocks.push(text)-1) + "K\n\n";
}


var _DoCodeSpans = function(text) {
//
//   *  Backtick quotes are used for <code></code> spans.
// 
//   *  You can use multiple backticks as the delimiters if you want to
//   include literal backticks in the code span. So, this input:
//   
//       Just type ``foo `bar` baz`` at the prompt.
//   
//     Will translate to:
//   
//       <p>Just type <code>foo `bar` baz</code> at the prompt.</p>
//   
//  There's no arbitrary limit to the number of backticks you
//  can use as delimters. If you need three consecutive backticks
//  in your code, use four for delimiters, etc.
//
//  *  You can use spaces to get literal backticks at the edges:
//   
//       ... type `` `bar` `` ...
//   
//     Turns to:
//   
//       ... type <code>`bar`</code> ...
//

    /*
        text = text.replace(/
            (^|[^\\])                   // Character before opening ` can't be a backslash
            (`+)                        // $2 = Opening run of `
            (                           // $3 = The code block
                [^\r]*?
                [^`]                    // attacklab: work around lack of lookbehind
            )
            \2                          // Matching closer
            (?!`)
        /gm, function(){...});
    */

    text = text.replace(/(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm,
        function(wholeMatch,m1,m2,m3,m4) {
            var c = m3;
            c = c.replace(/^([ \t]*)/g,""); // leading whitespace
            c = c.replace(/[ \t]*$/g,"");   // trailing whitespace
            c = _EncodeCode(c);
            return m1+"<code>"+c+"</code>";
        });

    return text;
}


var _EncodeCode = function(text) {
//
// Encode/escape certain characters inside Markdown code runs.
// The point is that in code, these characters are literals,
// and lose their special Markdown meanings.
//
    // Encode all ampersands; HTML entities are not
    // entities within a Markdown code span.
    text = text.replace(/&/g,"&amp;");

    // Do the angle bracket song and dance:
    text = text.replace(/</g,"&lt;");
    text = text.replace(/>/g,"&gt;");

    // Now, escape characters that are magic in Markdown:
    text = escapeCharacters(text,"\*_{}[]\\",false);

// jj the line above breaks this:
//---

//* Item

//   1. Subitem

//            special char: *
//---

    return text;
}


var _DoItalicsAndBold = function(text) {

    // <strong> must go first:
    text = text.replace(/(\*\*|__)(?=\S)([^\r]*?\S[*_]*)\1/g,
        "<strong>$2</strong>");

    text = text.replace(/(\*|_)(?=\S)([^\r]*?\S)\1/g,
        "<em>$2</em>");

    return text;
}


var _DoBlockQuotes = function(text) {

    /*
        text = text.replace(/
        (                               // Wrap whole match in $1
            (
                ^[ \t]*>[ \t]?          // '>' at the start of a line
                .+\n                    // rest of the first line
                (.+\n)*                 // subsequent consecutive lines
                \n*                     // blanks
            )+
        )
        /gm, function(){...});
    */

    text = text.replace(/((^[ \t]*>[ \t]?.+\n(.+\n)*\n*)+)/gm,
        function(wholeMatch,m1) {
            var bq = m1;

            // attacklab: hack around Konqueror 3.5.4 bug:
            // "----------bug".replace(/^-/g,"") == "bug"

            bq = bq.replace(/^[ \t]*>[ \t]?/gm,"~0");   // trim one level of quoting

            // attacklab: clean up hack
            bq = bq.replace(/~0/g,"");

            bq = bq.replace(/^[ \t]+$/gm,"");       // trim whitespace-only lines
            bq = _RunBlockGamut(bq);                // recurse
            
            bq = bq.replace(/(^|\n)/g,"$1  ");
            // These leading spaces screw with <pre> content, so we need to fix that:
            bq = bq.replace(
                    /(\s*<pre>[^\r]+?<\/pre>)/gm,
                function(wholeMatch,m1) {
                    var pre = m1;
                    // attacklab: hack around Konqueror 3.5.4 bug:
                    pre = pre.replace(/^  /mg,"~0");
                    pre = pre.replace(/~0/g,"");
                    return pre;
                });
            
            return hashBlock("<blockquote>\n" + bq + "\n</blockquote>");
        });
    return text;
}


var _FormParagraphs = function(text) {
//
//  Params:
//    $text - string to process with html <p> tags
//

    // Strip leading and trailing lines:
    text = text.replace(/^\n+/g,"");
    text = text.replace(/\n+$/g,"");

    var grafs = text.split(/\n{2,}/g);
    var grafsOut = new Array();

    //
    // Wrap <p> tags.
    //
    var end = grafs.length;
    for (var i=0; i<end; i++) {
        var str = grafs[i];

        // if this is an HTML marker, copy it
        if (str.search(/~K(\d+)K/g) >= 0) {
            grafsOut.push(str);
        }
        else if (str.search(/\S/) >= 0) {
            str = _RunSpanGamut(str);
            str = str.replace(/^([ \t]*)/g,"<p>");
            str += "</p>"
            grafsOut.push(str);
        }

    }

    //
    // Unhashify HTML blocks
    //
    end = grafsOut.length;
    for (var i=0; i<end; i++) {
        // if this is a marker for an html block...
        while (grafsOut[i].search(/~K(\d+)K/) >= 0) {
            var blockText = g_html_blocks[RegExp.$1];
            blockText = blockText.replace(/\$/g,"$$$$"); // Escape any dollar signs
            grafsOut[i] = grafsOut[i].replace(/~K\d+K/,blockText);
        }
    }

    return grafsOut.join("\n\n");
}


var _EncodeAmpsAndAngles = function(text) {
// Smart processing for ampersands and angle brackets that need to be encoded.
    
    // Ampersand-encoding based entirely on Nat Irons's Amputator MT plugin:
    //   http://bumppo.net/projects/amputator/
    text = text.replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/g,"&amp;");
    
    // Encode naked <'s
    text = text.replace(/<(?![a-z\/?\$!])/gi,"&lt;");
    
    return text;
}


var _EncodeBackslashEscapes = function(text) {
//
//   Parameter:  String.
//   Returns:   The string, with after processing the following backslash
//             escape sequences.
//

    // attacklab: The polite way to do this is with the new
    // escapeCharacters() function:
    //
    //  text = escapeCharacters(text,"\\",true);
    //  text = escapeCharacters(text,"`*_{}[]()>#+-.!",true);
    //
    // ...but we're sidestepping its use of the (slow) RegExp constructor
    // as an optimization for Firefox.  This function gets called a LOT.

    text = text.replace(/\\(\\)/g,escapeCharacters_callback);
    text = text.replace(/\\([`*_{}\[\]()>#+-.!])/g,escapeCharacters_callback);
    return text;
}


var _DoAutoLinks = function(text) {

    text = text.replace(/<((https?|ftp|dict):[^'">\s]+)>/gi,"<a href=\"$1\">$1</a>");

    // Email addresses: <address@domain.foo>

    /*
        text = text.replace(/
            <
            (?:mailto:)?
            (
                [-.\w]+
                \@
                [-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+
            )
            >
        /gi, _DoAutoLinks_callback());
    */
    text = text.replace(/<(?:mailto:)?([-.\w]+\@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)>/gi,
        function(wholeMatch,m1) {
            return _EncodeEmailAddress( _UnescapeSpecialChars(m1) );
        }
    );

    return text;
}


var _EncodeEmailAddress = function(addr) {
//
//  Input: an email address, e.g. "foo@example.com"
//
//  Output: the email address as a mailto link, with each character
//  of the address encoded as either a decimal or hex entity, in
//  the hopes of foiling most address harvesting spam bots. E.g.:
//
//  <a href="&#x6D;&#97;&#105;&#108;&#x74;&#111;:&#102;&#111;&#111;&#64;&#101;
//     x&#x61;&#109;&#x70;&#108;&#x65;&#x2E;&#99;&#111;&#109;">&#102;&#111;&#111;
//     &#64;&#101;x&#x61;&#109;&#x70;&#108;&#x65;&#x2E;&#99;&#111;&#109;</a>
//
//  Based on a filter by Matthew Wickline, posted to the BBEdit-Talk
//  mailing list: <http://tinyurl.com/yu7ue>
//

    // attacklab: why can't javascript speak hex?
    function char2hex(ch) {
        var hexDigits = '0123456789ABCDEF';
        var dec = ch.charCodeAt(0);
        return(hexDigits.charAt(dec>>4) + hexDigits.charAt(dec&15));
    }

    var encode = [
        function(ch){return "&#"+ch.charCodeAt(0)+";";},
        function(ch){return "&#x"+char2hex(ch)+";";},
        function(ch){return ch;}
    ];

    addr = "mailto:" + addr;

    addr = addr.replace(/./g, function(ch) {
        if (ch == "@") {
            // this *must* be encoded. I insist.
            ch = encode[Math.floor(Math.random()*2)](ch);
        } else if (ch !=":") {
            // leave ':' alone (to spot mailto: later)
            var r = Math.random();
            // roughly 10% raw, 45% hex, 45% dec
            ch =  (
                    r > .9  ?   encode[2](ch)   :
                    r > .45 ?   encode[1](ch)   :
                                encode[0](ch)
                );
        }
        return ch;
    });

    addr = "<a href=\"" + addr + "\">" + addr + "</a>";
    addr = addr.replace(/">.+:/g,"\">"); // strip the mailto: from the visible part

    return addr;
}


var _UnescapeSpecialChars = function(text) {
//
// Swap back in all the special characters we've hidden.
//
    text = text.replace(/~E(\d+)E/g,
        function(wholeMatch,m1) {
            var charCodeToReplace = parseInt(m1);
            return String.fromCharCode(charCodeToReplace);
        }
    );
    return text;
}


var _Outdent = function(text) {
//
// Remove one level of line-leading tabs or spaces
//

    // attacklab: hack around Konqueror 3.5.4 bug:
    // "----------bug".replace(/^-/g,"") == "bug"

    text = text.replace(/^(\t|[ ]{1,4})/gm,"~0"); // attacklab: g_tab_width

    // attacklab: clean up hack
    text = text.replace(/~0/g,"")

    return text;
}

var _Detab = function(text) {
// attacklab: Detab's completely rewritten for speed.
// In perl we could fix it by anchoring the regexp with \G.
// In javascript we're less fortunate.

    // expand first n-1 tabs
    text = text.replace(/\t(?=\t)/g,"    "); // attacklab: g_tab_width

    // replace the nth with two sentinels
    text = text.replace(/\t/g,"~A~B");

    // use the sentinel to anchor our regex so it doesn't explode
    text = text.replace(/~B(.+?)~A/g,
        function(wholeMatch,m1,m2) {
            var leadingText = m1;
            var numSpaces = 4 - leadingText.length % 4;  // attacklab: g_tab_width

            // there *must* be a better way to do this:
            for (var i=0; i<numSpaces; i++) leadingText+=" ";

            return leadingText;
        }
    );

    // clean up sentinels
    text = text.replace(/~A/g,"    ");  // attacklab: g_tab_width
    text = text.replace(/~B/g,"");

    return text;
}


//
//  attacklab: Utility functions
//


var escapeCharacters = function(text, charsToEscape, afterBackslash) {
    // First we have to escape the escape characters so that
    // we can build a character class out of them
    var regexString = "([" + charsToEscape.replace(/([\[\]\\])/g,"\\$1") + "])";

    if (afterBackslash) {
        regexString = "\\\\" + regexString;
    }

    var regex = new RegExp(regexString,"g");
    text = text.replace(regex,escapeCharacters_callback);

    return text;
}


var escapeCharacters_callback = function(wholeMatch,m1) {
    var charCodeToEscape = m1.charCodeAt(0);
    return "~E"+charCodeToEscape+"E";
}

} // end of Showdown.converter

// export
if (typeof exports != 'undefined') exports.Showdown = Showdown;

// XRegExp 1.5.0
// (c) 2007-2010 Steven Levithan
// MIT License
// <http://xregexp.com>
// Provides an augmented, extensible, cross-browser implementation of regular expressions,
// including support for additional syntax, flags, and methods

var XRegExp;

if (XRegExp) {
    // Avoid running twice, since that would break references to native globals
    throw Error("can't load XRegExp twice in the same frame");
}

// Run within an anonymous function to protect variables and avoid new globals
(function () {

    //---------------------------------
    //  Constructor
    //---------------------------------

    // Accepts a pattern and flags; returns a new, extended `RegExp` object. Differs from a native
    // regular expression in that additional syntax and flags are supported and cross-browser
    // syntax inconsistencies are ameliorated. `XRegExp(/regex/)` clones an existing regex and
    // converts to type XRegExp
    XRegExp = function (pattern, flags) {
        var output = [],
            currScope = XRegExp.OUTSIDE_CLASS,
            pos = 0,
            context, tokenResult, match, chr, regex;

        if (XRegExp.isRegExp(pattern)) {
            if (flags !== undefined)
                throw TypeError("can't supply flags when constructing one RegExp from another");
            return clone(pattern);
        }
        // Tokens become part of the regex construction process, so protect against infinite
        // recursion when an XRegExp is constructed within a token handler or trigger
        if (isInsideConstructor)
            throw Error("can't call the XRegExp constructor within token definition functions");

        flags = flags || "";
        context = { // `this` object for custom tokens
            hasNamedCapture: false,
            captureNames: [],
            hasFlag: function (flag) {return flags.indexOf(flag) > -1;},
            setFlag: function (flag) {flags += flag;}
        };

        while (pos < pattern.length) {
            // Check for custom tokens at the current position
            tokenResult = runTokens(pattern, pos, currScope, context);

            if (tokenResult) {
                output.push(tokenResult.output);
                pos += (tokenResult.match[0].length || 1);
            } else {
                // Check for native multicharacter metasequences (excluding character classes) at
                // the current position
                if (match = real.exec.call(nativeTokens[currScope], pattern.slice(pos))) {
                    output.push(match[0]);
                    pos += match[0].length;
                } else {
                    chr = pattern.charAt(pos);
                    if (chr === "[")
                        currScope = XRegExp.INSIDE_CLASS;
                    else if (chr === "]")
                        currScope = XRegExp.OUTSIDE_CLASS;
                    // Advance position one character
                    output.push(chr);
                    pos++;
                }
            }
        }

        regex = RegExp(output.join(""), real.replace.call(flags, flagClip, ""));
        regex._xregexp = {
            source: pattern,
            captureNames: context.hasNamedCapture ? context.captureNames : null
        };
        return regex;
    };


    //---------------------------------
    //  Public properties
    //---------------------------------

    XRegExp.version = "1.5.0";

    // Token scope bitflags
    XRegExp.INSIDE_CLASS = 1;
    XRegExp.OUTSIDE_CLASS = 2;


    //---------------------------------
    //  Private variables
    //---------------------------------

    var replacementToken = /\$(?:(\d\d?|[$&`'])|{([$\w]+)})/g,
        flagClip = /[^gimy]+|([\s\S])(?=[\s\S]*\1)/g, // Nonnative and duplicate flags
        quantifier = /^(?:[?*+]|{\d+(?:,\d*)?})\??/,
        isInsideConstructor = false,
        tokens = [],
        // Copy native globals for reference ("native" is an ES3 reserved keyword)
        real = {
            exec: RegExp.prototype.exec,
            test: RegExp.prototype.test,
            match: String.prototype.match,
            replace: String.prototype.replace,
            split: String.prototype.split
        },
        compliantExecNpcg = real.exec.call(/()??/, "")[1] === undefined, // check `exec` handling of nonparticipating capturing groups
        compliantLastIndexIncrement = function () {
            var x = /^/g;
            real.test.call(x, "");
            return !x.lastIndex;
        }(),
        compliantLastIndexReset = function () {
            var x = /x/g;
            real.replace.call("x", x, "");
            return !x.lastIndex;
        }(),
        hasNativeY = RegExp.prototype.sticky !== undefined,
        nativeTokens = {};

    // `nativeTokens` match native multicharacter metasequences only (including deprecated octals,
    // excluding character classes)
    nativeTokens[XRegExp.INSIDE_CLASS] = /^(?:\\(?:[0-3][0-7]{0,2}|[4-7][0-7]?|x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|c[A-Za-z]|[\s\S]))/;
    nativeTokens[XRegExp.OUTSIDE_CLASS] = /^(?:\\(?:0(?:[0-3][0-7]{0,2}|[4-7][0-7]?)?|[1-9]\d*|x[\dA-Fa-f]{2}|u[\dA-Fa-f]{4}|c[A-Za-z]|[\s\S])|\(\?[:=!]|[?*+]\?|{\d+(?:,\d*)?}\??)/;


    //---------------------------------
    //  Public methods
    //---------------------------------

    // Lets you extend or change XRegExp syntax and create custom flags. This is used internally by
    // the XRegExp library and can be used to create XRegExp plugins. This function is intended for
    // users with advanced knowledge of JavaScript's regular expression syntax and behavior. It can
    // be disabled by `XRegExp.freezeTokens`
    XRegExp.addToken = function (regex, handler, scope, trigger) {
        tokens.push({
            pattern: clone(regex, "g" + (hasNativeY ? "y" : "")),
            handler: handler,
            scope: scope || XRegExp.OUTSIDE_CLASS,
            trigger: trigger || null
        });
    };

    // Accepts a pattern and flags; returns an extended `RegExp` object. If the pattern and flag
    // combination has previously been cached, the cached copy is returned; otherwise the newly
    // created regex is cached
    XRegExp.cache = function (pattern, flags) {
        var key = pattern + "/" + (flags || "");
        return XRegExp.cache[key] || (XRegExp.cache[key] = XRegExp(pattern, flags));
    };

    // Accepts a `RegExp` instance; returns a copy with the `/g` flag set. The copy has a fresh
    // `lastIndex` (set to zero). If you want to copy a regex without forcing the `global`
    // property, use `XRegExp(regex)`. Do not use `RegExp(regex)` because it will not preserve
    // special properties required for named capture
    XRegExp.copyAsGlobal = function (regex) {
        return clone(regex, "g");
    };

    // Accepts a string; returns the string with regex metacharacters escaped. The returned string
    // can safely be used at any point within a regex to match the provided literal string. Escaped
    // characters are [ ] { } ( ) * + ? - . , \ ^ $ | # and whitespace
    XRegExp.escape = function (str) {
        return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    };

    // Accepts a string to search, regex to search with, position to start the search within the
    // string (default: 0), and an optional Boolean indicating whether matches must start at-or-
    // after the position or at the specified position only. This function ignores the `lastIndex`
    // property of the provided regex
    XRegExp.execAt = function (str, regex, pos, anchored) {
        regex = clone(regex, "g" + ((anchored && hasNativeY) ? "y" : ""));
        regex.lastIndex = pos = pos || 0;
        var match = regex.exec(str);
        if (anchored)
            return (match && match.index === pos) ? match : null;
        else
            return match;
    };

    // Breaks the unrestorable link to XRegExp's private list of tokens, thereby preventing
    // syntax and flag changes. Should be run after XRegExp and any plugins are loaded
    XRegExp.freezeTokens = function () {
        XRegExp.addToken = function () {
            throw Error("can't run addToken after freezeTokens");
        };
    };

    // Accepts any value; returns a Boolean indicating whether the argument is a `RegExp` object.
    // Note that this is also `true` for regex literals and regexes created by the `XRegExp`
    // constructor. This works correctly for variables created in another frame, when `instanceof`
    // and `constructor` checks would fail to work as intended
    XRegExp.isRegExp = function (o) {
        return Object.prototype.toString.call(o) === "[object RegExp]";
    };

    // Executes `callback` once per match within `str`. Provides a simpler and cleaner way to
    // iterate over regex matches compared to the traditional approaches of subverting
    // `String.prototype.replace` or repeatedly calling `exec` within a `while` loop
    XRegExp.iterate = function (str, origRegex, callback, context) {
        var regex = clone(origRegex, "g"),
            i = -1, match;
        while (match = regex.exec(str)) {
            callback.call(context, match, ++i, str, regex);
            if (regex.lastIndex === match.index)
                regex.lastIndex++;
        }
        if (origRegex.global)
            origRegex.lastIndex = 0;
    };

    // Accepts a string and an array of regexes; returns the result of using each successive regex
    // to search within the matches of the previous regex. The array of regexes can also contain
    // objects with `regex` and `backref` properties, in which case the named or numbered back-
    // references specified are passed forward to the next regex or returned. E.g.:
    // var xregexpImgFileNames = XRegExp.matchChain(html, [
    //     {regex: /<img\b([^>]+)>/i, backref: 1}, // <img> tag attributes
    //     {regex: XRegExp('(?ix) \\s src=" (?<src> [^"]+ )'), backref: "src"}, // src attribute values
    //     {regex: XRegExp("^http://xregexp\\.com(/[^#?]+)", "i"), backref: 1}, // xregexp.com paths
    //     /[^\/]+$/ // filenames (strip directory paths)
    // ]);
    XRegExp.matchChain = function (str, chain) {
        return function recurseChain (values, level) {
            var item = chain[level].regex ? chain[level] : {regex: chain[level]},
                regex = clone(item.regex, "g"),
                matches = [], i;
            for (i = 0; i < values.length; i++) {
                XRegExp.iterate(values[i], regex, function (match) {
                    matches.push(item.backref ? (match[item.backref] || "") : match[0]);
                });
            }
            return ((level === chain.length - 1) || !matches.length) ?
                matches : recurseChain(matches, level + 1);
        }([str], 0);
    };


    //---------------------------------
    //  New RegExp prototype methods
    //---------------------------------

    // Accepts a context object and arguments array; returns the result of calling `exec` with the
    // first value in the arguments array. the context is ignored but is accepted for congruity
    // with `Function.prototype.apply`
    RegExp.prototype.apply = function (context, args) {
        return this.exec(args[0]);
    };

    // Accepts a context object and string; returns the result of calling `exec` with the provided
    // string. the context is ignored but is accepted for congruity with `Function.prototype.call`
    RegExp.prototype.call = function (context, str) {
        return this.exec(str);
    };


    //---------------------------------
    //  Overriden native methods
    //---------------------------------

    // Adds named capture support (with backreferences returned as `result.name`), and fixes two
    // cross-browser issues per ES3:
    // - Captured values for nonparticipating capturing groups should be returned as `undefined`,
    //   rather than the empty string.
    // - `lastIndex` should not be incremented after zero-length matches.
    RegExp.prototype.exec = function (str) {
        var match = real.exec.apply(this, arguments),
            name, r2;
        if (match) {
            // Fix browsers whose `exec` methods don't consistently return `undefined` for
            // nonparticipating capturing groups
            if (!compliantExecNpcg && match.length > 1 && indexOf(match, "") > -1) {
                r2 = RegExp(this.source, real.replace.call(getNativeFlags(this), "g", ""));
                // Using `str.slice(match.index)` rather than `match[0]` in case lookahead allowed
                // matching due to characters outside the match
                real.replace.call(str.slice(match.index), r2, function () {
                    for (var i = 1; i < arguments.length - 2; i++) {
                        if (arguments[i] === undefined)
                            match[i] = undefined;
                    }
                });
            }
            // Attach named capture properties
            if (this._xregexp && this._xregexp.captureNames) {
                for (var i = 1; i < match.length; i++) {
                    name = this._xregexp.captureNames[i - 1];
                    if (name)
                       match[name] = match[i];
                }
            }
            // Fix browsers that increment `lastIndex` after zero-length matches
            if (!compliantLastIndexIncrement && this.global && !match[0].length && (this.lastIndex > match.index))
                this.lastIndex--;
        }
        return match;
    };

    // Don't override `test` if it won't change anything
    if (!compliantLastIndexIncrement) {
        // Fix browser bug in native method
        RegExp.prototype.test = function (str) {
            // Use the native `exec` to skip some processing overhead, even though the overriden
            // `exec` would take care of the `lastIndex` fix
            var match = real.exec.call(this, str);
            // Fix browsers that increment `lastIndex` after zero-length matches
            if (match && this.global && !match[0].length && (this.lastIndex > match.index))
                this.lastIndex--;
            return !!match;
        };
    }

    // Adds named capture support and fixes browser bugs in native method
    String.prototype.match = function (regex) {
        if (!XRegExp.isRegExp(regex))
            regex = RegExp(regex); // Native `RegExp`
        if (regex.global) {
            var result = real.match.apply(this, arguments);
            regex.lastIndex = 0; // Fix IE bug
            return result;
        }
        return regex.exec(this); // Run the altered `exec`
    };

    // Adds support for `${n}` tokens for named and numbered backreferences in replacement text,
    // and provides named backreferences to replacement functions as `arguments[0].name`. Also
    // fixes cross-browser differences in replacement text syntax when performing a replacement
    // using a nonregex search value, and the value of replacement regexes' `lastIndex` property
    // during replacement iterations. Note that this doesn't support SpiderMonkey's proprietary
    // third (`flags`) parameter
    String.prototype.replace = function (search, replacement) {
        var isRegex = XRegExp.isRegExp(search),
            captureNames, result, str;

        // There are many combinations of search/replacement types/values and browser bugs that
        // preclude passing to native `replace`, so just keep this check relatively simple
        if (isRegex && typeof replacement.valueOf() === "string" && replacement.indexOf("${") === -1 && compliantLastIndexReset)
            return real.replace.apply(this, arguments);

        if (!isRegex)
            search = search + ""; // Type conversion
        else if (search._xregexp)
            captureNames = search._xregexp.captureNames; // Array or `null`

        if (typeof replacement === "function") {
            result = real.replace.call(this, search, function () {
                if (captureNames) {
                    // Change the `arguments[0]` string primitive to a String object which can store properties
                    arguments[0] = new String(arguments[0]);
                    // Store named backreferences on `arguments[0]`
                    for (var i = 0; i < captureNames.length; i++) {
                        if (captureNames[i])
                            arguments[0][captureNames[i]] = arguments[i + 1];
                    }
                }
                // Update `lastIndex` before calling `replacement`
                if (isRegex && search.global)
                    search.lastIndex = arguments[arguments.length - 2] + arguments[0].length;
                return replacement.apply(null, arguments);
            });
        } else {
            str = this + ""; // Type conversion, so `args[args.length - 1]` will be a string (given nonstring `this`)
            result = real.replace.call(str, search, function () {
                var args = arguments; // Keep this function's `arguments` available through closure
                return real.replace.call(replacement, replacementToken, function ($0, $1, $2) {
                    // Numbered backreference (without delimiters) or special variable
                    if ($1) {
                        switch ($1) {
                            case "$": return "$";
                            case "&": return args[0];
                            case "`": return args[args.length - 1].slice(0, args[args.length - 2]);
                            case "'": return args[args.length - 1].slice(args[args.length - 2] + args[0].length);
                            // Numbered backreference
                            default:
                                // What does "$10" mean?
                                // - Backreference 10, if 10 or more capturing groups exist
                                // - Backreference 1 followed by "0", if 1-9 capturing groups exist
                                // - Otherwise, it's the string "$10"
                                // Also note:
                                // - Backreferences cannot be more than two digits (enforced by `replacementToken`)
                                // - "$01" is equivalent to "$1" if a capturing group exists, otherwise it's the string "$01"
                                // - There is no "$0" token ("$&" is the entire match)
                                var literalNumbers = "";
                                $1 = +$1; // Type conversion; drop leading zero
                                if (!$1) // `$1` was "0" or "00"
                                    return $0;
                                while ($1 > args.length - 3) {
                                    literalNumbers = String.prototype.slice.call($1, -1) + literalNumbers;
                                    $1 = Math.floor($1 / 10); // Drop the last digit
                                }
                                return ($1 ? args[$1] || "" : "$") + literalNumbers;
                        }
                    // Named backreference or delimited numbered backreference
                    } else {
                        // What does "${n}" mean?
                        // - Backreference to numbered capture n. Two differences from "$n":
                        //   - n can be more than two digits
                        //   - Backreference 0 is allowed, and is the entire match
                        // - Backreference to named capture n, if it exists and is not a number overridden by numbered capture
                        // - Otherwise, it's the string "${n}"
                        var n = +$2; // Type conversion; drop leading zeros
                        if (n <= args.length - 3)
                            return args[n];
                        n = captureNames ? indexOf(captureNames, $2) : -1;
                        return n > -1 ? args[n + 1] : $0;
                    }
                });
            });
        }

        if (isRegex && search.global)
            search.lastIndex = 0; // Fix IE bug

        return result;
    };

    // A consistent cross-browser, ES3 compliant `split`
    String.prototype.split = function (s /* separator */, limit) {
        // If separator `s` is not a regex, use the native `split`
        if (!XRegExp.isRegExp(s))
            return real.split.apply(this, arguments);

        var str = this + "", // Type conversion
            output = [],
            lastLastIndex = 0,
            match, lastLength;

        // Behavior for `limit`: if it's...
        // - `undefined`: No limit
        // - `NaN` or zero: Return an empty array
        // - A positive number: Use `Math.floor(limit)`
        // - A negative number: No limit
        // - Other: Type-convert, then use the above rules
        if (limit === undefined || +limit < 0) {
            limit = Infinity;
        } else {
            limit = Math.floor(+limit);
            if (!limit)
                return [];
        }

        // This is required if not `s.global`, and it avoids needing to set `s.lastIndex` to zero
        // and restore it to its original value when we're done using the regex
        s = XRegExp.copyAsGlobal(s);

        while (match = s.exec(str)) { // Run the altered `exec` (required for `lastIndex` fix, etc.)
            if (s.lastIndex > lastLastIndex) {
                output.push(str.slice(lastLastIndex, match.index));

                if (match.length > 1 && match.index < str.length)
                    Array.prototype.push.apply(output, match.slice(1));

                lastLength = match[0].length;
                lastLastIndex = s.lastIndex;

                if (output.length >= limit)
                    break;
            }

            if (s.lastIndex === match.index)
                s.lastIndex++;
        }

        if (lastLastIndex === str.length) {
            if (!real.test.call(s, "") || lastLength)
                output.push("");
        } else {
            output.push(str.slice(lastLastIndex));
        }

        return output.length > limit ? output.slice(0, limit) : output;
    };


    //---------------------------------
    //  Private helper functions
    //---------------------------------

    // Supporting function for `XRegExp`, `XRegExp.copyAsGlobal`, etc. Returns a copy of a `RegExp`
    // instance with a fresh `lastIndex` (set to zero), preserving properties required for named
    // capture. Also allows adding new flags in the process of copying the regex
    function clone (regex, additionalFlags) {
        if (!XRegExp.isRegExp(regex))
            throw TypeError("type RegExp expected");
        var x = regex._xregexp;
        regex = XRegExp(regex.source, getNativeFlags(regex) + (additionalFlags || ""));
        if (x) {
            regex._xregexp = {
                source: x.source,
                captureNames: x.captureNames ? x.captureNames.slice(0) : null
            };
        }
        return regex;
    };

    function getNativeFlags (regex) {
        return (regex.global     ? "g" : "") +
               (regex.ignoreCase ? "i" : "") +
               (regex.multiline  ? "m" : "") +
               (regex.extended   ? "x" : "") + // Proposed for ES4; included in AS3
               (regex.sticky     ? "y" : "");
    };

    function runTokens (pattern, index, scope, context) {
        var i = tokens.length,
            result, match, t;
        // Protect against constructing XRegExps within token handler and trigger functions
        isInsideConstructor = true;
        // Must reset `isInsideConstructor`, even if a `trigger` or `handler` throws
        try {
            while (i--) { // Run in reverse order
                t = tokens[i];
                if ((scope & t.scope) && (!t.trigger || t.trigger.call(context))) {
                    t.pattern.lastIndex = index;
                    match = t.pattern.exec(pattern); // Running the altered `exec` here allows use of named backreferences, etc.
                    if (match && match.index === index) {
                        result = {
                            output: t.handler.call(context, match, scope),
                            match: match
                        };
                        break;
                    }
                }
            }
        } catch (err) {
            throw err;
        } finally {
            isInsideConstructor = false;
        }
        return result;
    };

    function indexOf (array, item, from) {
        if (Array.prototype.indexOf) // Use the native array method if available
            return array.indexOf(item, from);
        for (var i = from || 0; i < array.length; i++) {
            if (array[i] === item)
                return i;
        }
        return -1;
    };


    //---------------------------------
    //  Built-in tokens
    //---------------------------------

    // Augment XRegExp's regular expression syntax and flags. Note that when adding tokens, the
    // third (`scope`) argument defaults to `XRegExp.OUTSIDE_CLASS`

    // Comment pattern: (?# )
    XRegExp.addToken(
        /\(\?#[^)]*\)/,
        function (match) {
            // Keep tokens separated unless the following token is a quantifier
            return real.test.call(quantifier, match.input.slice(match.index + match[0].length)) ? "" : "(?:)";
        }
    );

    // Capturing group (match the opening parenthesis only).
    // Required for support of named capturing groups
    XRegExp.addToken(
        /\((?!\?)/,
        function () {
            this.captureNames.push(null);
            return "(";
        }
    );

    // Named capturing group (match the opening delimiter only): (?<name>
    XRegExp.addToken(
        /\(\?<([$\w]+)>/,
        function (match) {
            this.captureNames.push(match[1]);
            this.hasNamedCapture = true;
            return "(";
        }
    );

    // Named backreference: \k<name>
    XRegExp.addToken(
        /\\k<([\w$]+)>/,
        function (match) {
            var index = indexOf(this.captureNames, match[1]);
            // Keep backreferences separate from subsequent literal numbers. Preserve back-
            // references to named groups that are undefined at this point as literal strings
            return index > -1 ?
                "\\" + (index + 1) + (isNaN(match.input.charAt(match.index + match[0].length)) ? "" : "(?:)") :
                match[0];
        }
    );

    // Empty character class: [] or [^]
    XRegExp.addToken(
        /\[\^?]/,
        function (match) {
            // For cross-browser compatibility with ES3, convert [] to \b\B and [^] to [\s\S].
            // (?!) should work like \b\B, but is unreliable in Firefox
            return match[0] === "[]" ? "\\b\\B" : "[\\s\\S]";
        }
    );

    // Mode modifier at the start of the pattern only, with any combination of flags imsx: (?imsx)
    // Does not support x(?i), (?-i), (?i-m), (?i: ), (?i)(?m), etc.
    XRegExp.addToken(
        /^\(\?([imsx]+)\)/,
        function (match) {
            this.setFlag(match[1]);
            return "";
        }
    );

    // Whitespace and comments, in free-spacing (aka extended) mode only
    XRegExp.addToken(
        /(?:\s+|#.*)+/,
        function (match) {
            // Keep tokens separated unless the following token is a quantifier
            return real.test.call(quantifier, match.input.slice(match.index + match[0].length)) ? "" : "(?:)";
        },
        XRegExp.OUTSIDE_CLASS,
        function () {return this.hasFlag("x");}
    );

    // Dot, in dotall (aka singleline) mode only
    XRegExp.addToken(
        /\./,
        function () {return "[\\s\\S]";},
        XRegExp.OUTSIDE_CLASS,
        function () {return this.hasFlag("s");}
    );


    //---------------------------------
    //  Backward compatibility
    //---------------------------------

    // Uncomment the following block for compatibility with XRegExp 1.0-1.2:
    /*
    XRegExp.matchWithinChain = XRegExp.matchChain;
    RegExp.prototype.addFlags = function (s) {return clone(this, s);};
    RegExp.prototype.execAll = function (s) {var r = []; XRegExp.iterate(s, this, function (m) {r.push(m);}); return r;};
    RegExp.prototype.forEachExec = function (s, f, c) {return XRegExp.iterate(s, this, f, c);};
    RegExp.prototype.validate = function (s) {var r = RegExp("^(?:" + this.source + ")$(?!\\s)", getNativeFlags(this)); if (this.global) this.lastIndex = 0; return s.search(r) === 0;};
    */

})();


