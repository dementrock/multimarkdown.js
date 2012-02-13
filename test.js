const fs = require( "fs" ),
      markdown = require( "./multimarkdown" );

// get the list of all test collections
var fixtures = fs.readdirSync( "fixtures" );

converter = new markdown.Showdown.converter();
for (var i in fixtures) {
    if (fixtures[i].match(/\.text$/)) {
        var input = fs.readFileSync('fixtures/' + fixtures[i]).toString();
        var output = fs.readFileSync('fixtures/' + fixtures[i].substring(0, fixtures[i].length - 5) + '.html').toString();
        var markdownOutput = converter.makeHtml(input);
        markdownOutput = markdownOutput.replace(/[\s\r\n]/g, '');
        output = output.replace(/[\s\r\n]/g, '');
        if (markdownOutput != output) {
            console.log('mmd output:\n' + markdownOutput + '\nshould be:\n' + output);
            break;
        }
    }
  /*var name = fixtures[ f ].substring( fixtures[ f ].lastIndexOf( "/" ) + 1 );
    // grab all the test files in this fixture
    var tests = fs.list( fixtures[ f ] );

    // filter to only the raw files
    tests = tests.filter( function( x ) {x.match( /\.text$/ )} );

    // remove the extensions
    tests = tests.map( function( x ) {x.replace( /\.text$/, "" )} );

    for ( var t in tests ) {
      // load the raw text
      var text = fs.rawOpen( tests[ t ] + ".text", "r" ).readWhole();

      // load the target output
      var html = fs.isFile( tests[ t ] + ".html" )
        ? fs.rawOpen( tests[ t ] + ".html", "r" ).readWhole()
        : fs.rawOpen( tests[ t ] + ".xhtml", "r" ).readWhole();

      asserts.same( markdown.toHTML( text ),
                    html,
                    tests[ t ].substring( tests[ t ].lastIndexOf( "/" ) + 1 ) );
    }
  }*/
}
