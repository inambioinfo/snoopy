"use strict";

var variants = require('./variant.js');
var SNP = variants.SNP;
var CNV = variants.CNV;
var utils = require('./utils.js');
var getExtension = utils.getExtension;
var httpGet = utils.httpGet;
var localTextGet = utils.localTextGet;
var styleSheets = require('./styles.js');
var loadedfiletypes = require('./loadedfiletypes.js');
var RemoteBAM = loadedfiletypes.RemoteBAM;
var RemoteBAI = loadedfiletypes.RemoteBAI;
var SSHBAM = loadedfiletypes.SSHBAM;
var LocalBAM = loadedfiletypes.LocalBAM;
var LocalBAI = loadedfiletypes.LocalBAI;
var Settings = require('./components/settings.jsx');
var JSZip = require('JSZip');

const BAI_RE = /^(.*)\.bai$/i;
const BAM_RE = /^(.*)\.bam$/i;
const SNP_RE = /^\s*(chr)?([0-9,m,x,y]+)[-:,\s](\d+)\s*$/i;
const CNV_RE = /^\s*(chr)?([0-9,m,x,y]+)[-:,\s](\d+)[-:,\s](\d+)\s*$/i;

const referenceGenome = {
  name: 'Genome',
  twoBitURI: 'http://www.biodalliance.org/datasets/hg19.2bit',
  tier_type: 'sequence',
  provides_entrypoints: true,
  pinned: true
};

class Session {
  constructor(bamFiles, variantFile) {
    this.bamFiles = bamFiles || [];
    this.baiFiles = [];
    this.variantFile = variantFile || [];
    this.variants = [];
    this.index = 0;
    //this.ID = utils.getNextUID();
  }

  addVariants(variants, connection) {
    return new Promise((resolve, reject) => {
      // var re_dna_location = /[chr]*[0-9,m,x,y]+[-:,\s]+\w+/i;
      switch (typeof(variants)) {
        case 'string':
          if (variants.match(SNP_RE) || variants.match(CNV_RE)) {
            // A single dna location
            this.parseVariants(variants);
            resolve();
          } else {
            // A path to a file at a remote location
            httpGet(variants, connection).then(response => {
              console.log(response);
              this.parseVariants(response);
            }).then(() => {
              this.variantFile = variants;
              resolve();
            }).catch(error => {
              reject(error);
            });
          }
          break;
        case 'object':
          if (connection.get('type') === 'local') {
            console.log('local file');
            console.log(variants[0]);
            this.variantFile = variants[0].name;
            localTextGet(variants[0]).then(result => {
              console.log(result);
              this.parseVariants(result);
              console.log('finished parsing variants');
              resolve();
            }).catch(error => {
              reject(error);
            });
          } else {
            // An array of single dna locations
            this.parseVariants(variants);
            resolve();
          }
          break;
        default:
          reject('Unrecognized type for: ' + variants);
      }
    });
  }

  generateQCreport() {
    // Create an object which will be exported as JSON
    let files = this.bamFiles.reduce((accum, file)  => {
      return accum.concat(file.name)
    }, []);

    let variants = this.variants.reduce((accum, variant)  => {
      return accum.concat(variant.toObject())
    }, []);


    return {
      files: files,
      variants: variants
    };

    // var str = "\n\nVariant File\n" + this.variantFile.name;
    // str += "\n\nBAM Files\n";
    // for (var i = 0; i < this.bamFiles.length; i++) {
    //   str += this.bamFiles[i].name + "\n";
    // }
    // str += "\n";
    // for (var i = 0; i < this.variants.length; i++) {
    //   str += this.variants[i].string() + "\n"; 
    // }
    // return str;
  }

  addSequenceFile(file, connection) {
    return new Promise((resolve, reject) => {
      if (typeof(file) === 'string') { // a URL
        console.log('alsjdfkl;ajsdfkl;jasd;fkl')
        console.log(file);
        console.log(connection);
        switch (getExtension(file)) {
          case "bam":
          case "cram":
            switch (connection.get('type')) {
              case 'HTTP':
                var requiresCredentials = connection.get('requiresCredentials', false);
                var newBam = new RemoteBAM(file, requiresCredentials);
                break;
              case 'SSHBridge':
                var newBam = new SSHBAM(file);
                break;
            }
            newBam.exists().then(result => {
              // console.log(result);
              // console.log('it exists');
              this.bamFiles.push(newBam);
              resolve();
            }).catch((e) => {
              console.log('error in the addSequenceFile ' +  e); 
              reject(e);
            });
            break;
          case "bai":
            var newBai = new RemoteBAI(file);
            this.baiFiles.push(newBai);
            break;
        }
      } else { // a file object
        for (let i=0; i < file.length; ++i) {
          let f = file[i];
          // console.log(f);
          switch (getExtension(f)) {
            case "bam":
              var newBam = new LocalBAM(f);
              this.bamFiles.push(newBam);
              break;
            case "bai":
              var newBai = new LocalBAI(f);
              this.baiFiles.push(newBai);
              break;
          }
        }
        resolve();
      }
      
    });
  }

  /** Determines if any unmatched LocalBAM's have a matching LocalBAI. It is not necessary for
  a RemoteBAM to have a RemoteBAI, as it assumed to be in the same location, but if any RemoteBAI's 
  have been provided, marry these to a RemoteBAM. */
  matchMaker() {
    var toRemove = [];
    for (var i=0; i<this.bamFiles.length; ++i) {
      var bamFile = this.bamFiles[i];
      if (!bamFile.index) {
        var stripBam = bamFile.name.match(BAM_RE);
        for (var j=0; j<this.baiFiles.length; ++j) {
          var baiFile = this.baiFiles[j];
          var stripBai = baiFile.name.match(BAI_RE);
          if ((stripBai[1] === bamFile.name) || (stripBai[1] === stripBam[1]) &&
            (bamFile.file.type === baiFile.file.type)) {
            this.bamFiles[i].index = baiFile;
            toRemove.push(baiFile.id);
          }
        }
      }
    }
    toRemove.forEach(id => {this.remove(id)});
  }

  remove(id) {
    this.bamFiles = this.bamFiles.filter(function(bamFile) {
      return bamFile.id !== id;
    })
    this.baiFiles = this.baiFiles.filter(function(baiFile) {
      return baiFile.id !== id;
    })
  }

  setQC(decision) {
    this.variants[this.index].score = decision;
  }


  next(b, callback) {
    if (this.index < this.variants.length - 1) {
      return {variant: this.variants[++this.index].visit(b, callback), done: false};
    } else { // at the end now
      return {variant: this.variants[this.index].visit(b, callback), done: true};
    }
  }

  gotoCurrentVariant(b, callback) {
    this.variants[this.index].visit(b, callback);
    return this.variants[this.index];
  }

  getCurrentVariant() {
    return this.variants[this.index];
  }

  previous(b) {
    if (this.index > 0) {
      this.index--;
      return this.gotoCurrentVariant(b);
      // return this.getCurrentVariant();
    } else {
      return false;
    }
  }

  getNumVariantsReviewed() {
    var reviewed = this.variants.filter((variant) => {
       return variant.score !== 'not reviewed';
    });
    return reviewed.length;
  }

  parseVariants(variants) {
    // the variants have not been loaded so process the contents of the variant file text
    this.variants = [];

    if (typeof(variants) === 'string') {
      variants = variants.trim();
      variants = variants.split("\n");
    }
    //var pattern = /\s*[-:,\s]+\s*/;
    variants.map(variant => {
      var snp = variant.match(SNP_RE);
      var cnv = variant.match(CNV_RE);
      if (snp) {
        var [, , chr, loc] = snp;
        var v = new SNP(chr, loc);
      } else if (cnv) {
        var [, , chr, start, end] = cnv;
        var v = new CNV(chr, start, end);
      } else {
        throw 'Unrecognized variant: ' + variant;
      }
      this.variants.push(v);
    });
    // for (var i = 0; i < variants.length; i++) {
    //   var variant = variants[i].trim();
    //   var parts = variant.split(pattern);
    //   var chr = parts[0];
    //     switch (parts.length) {
    //       case 2: // SNP
    //         var loc = parseInt(parts[1]);
    //         var v = new SNP(chr, loc);
    //         break;
    //       case 3: // CNV
    //         var start = parseInt(parts[1]);
    //         var end = parseInt(parts[2]);
    //         var v = new CNV(chr, start, end);
    //         break;
    //       default:
    //         console.log("Unrecognized variant");
    //         console.log(variant);
    //         throw 'Unrecognized variant: ' + variant;
    //     }
    //     console.log(this);
    //     this.variants.push(v);
    // }
  }

  init(b, style) {
    b.removeAllTiers();
    //this.browser.baseColors = app.settings.colors;
    b.addTier(referenceGenome);
    console.log(style);
    this.bamFiles.forEach((bamFile) => {
      // var style = styleSheets['raw'].style;
      b.addTier(bamFile.getTier(style.toJS()));
    });
    this.index = 0;

    // for (var i=0; i < this.bamFiles.length; ++i) {
    //     var style = styleSheets['raw'].styles;
    //     var bamTier = this.bamFiles[i].getTier(style);
    //     // if (app.settings.dallianceView === 'condensed')
    //     //     bamTier.padding = 0;
    //     // if (bamTier) { 
    //     //     app.browser.addTier(bamTier);
    //     // } 
    //     b.addTier(bamTier);
    // }
    // b.refresh();
  }

  goto(b, style, vi) {
    b.removeAllTiers();
    //this.browser.baseColors = app.settings.colors;
    b.addTier(referenceGenome);
    this.bamFiles.forEach((bamFile) => {
      b.addTier(bamFile.getTier(style.toJS()));
    });
    this.index = vi;
    return this.gotoCurrentVariant(b);
  }

  getCurrentVariantIndex() {
    return this.index;
  }

  isReady() {
    if (this.variants.length === 0)
      return false;
    if (this.bamFiles.length === 0)
      return false;
    for (let i=0; i<this.bamFiles.length; i++) {
      if (this.bamFiles[i].index === null)
        return false;
    }
    return true;
  }

  unmatchedSequenceFiles() {
    return this.bamFiles.reduce((accum, bamFile)  => {
      if (bamFile.index === false)
        return accum.concat(bamFile);
      else
        return accum;
    }, []);
  }

  unmatchedIndexFiles() {
    return this.baiFiles;
  }

  stringCurrentSession() {
    var str = ''
    this.bamFiles.forEach((bam) => {str += bam.name + '_'});
    str += this.variants[this.index].fileString()
    return str;
  }

  updateStyle(b, style) {
    // get styles and update each tier
    // app.browser.baseColors = app.settings.colors;
    for (var i=1; i<b.tiers.length; ++i) {
      b.tiers[i].setStylesheet(style.toJS());
    }
    b.refresh();
  }
  
  getHTMLResultsSelectionModal() {
    
    let variants = this.variants.map((variant, variantIndex)  => {
      return `
        <a href="#" class="list-group-item">
          ${variant.getHTML()}
        </a>
      `;
    }).join('');

    let files = this.bamFiles.map((file, fileIndex)  => {
      return `
        <li>
          ${file.name}
        </li>
      `;
    }).join('');

    let s = `
      <a href="#" class="list-group-item active seq-file-list">
        <ul>
          ${files}
        </ul>
      </a>
      ${variants}
    `;

    return s
  }

  takeSnapshot(browser) {
    console.log(browser)
    this.variants[this.index].takeSnapshot(browser);
  }

  getNumSnapshots() {
    let n = this.variants.reduce((accum, v) => {
      if (!!v.snapshot)
        return accum + 1;
      else
        return accum;
    }, 0);
    return n;
  }

  getSnasphots(imageFolder) {
    let imgName = this.bamFiles.reduce((accum, f) => {
      if (accum.length === 0)
        return f.name;
      else
        return `${accum}_${f.name}`;
    }, '');
    this.variants.forEach(v => {
      if (!!v.snapshot) {
        imageFolder.file(
          `${imgName}_${v.fileString()}.png`,
          v.snapshot,
          {base64: true}
        );
      }
    });
  }

}

export default Session;
