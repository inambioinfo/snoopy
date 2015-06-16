var React = require('react');

var rb = require('react-bootstrap');
var Alert = rb.Alert;
var Panel = rb.Panel;
var Col = rb.Col;
var Row = rb.Row;
var Grid = rb.Grid;
var Button = rb.Button;
var Glyphicon = rb.Glyphicon;
var Pager = rb.Pager;
var PageItem = rb.PageItem;
var ModalTrigger = rb.ModalTrigger;
var ListGroup = rb.ListGroup;
var ListGroupItem = rb.ListGroupItem;
var Input = rb.Input;

var FileLoader = require('./fileloader.jsx');
var utils = require('../utils.js');
var getExtension = utils.getExtension;
var getName = utils.getName;
var httpGet = utils.httpGet;
var localTextGet = utils.localTextGet;
var getURL = utils.getURL;

var session = require('../session.js');
var Session = session.Session;
var Sessions = session.Sessions;

var lft = require('../loadedfiletypes.js');
var LocalBAM = lft.LocalBAM;
var LocalBAI = lft.LocalBAI;
var SSHBAM = lft.SSHBAM;
var RemoteBAM = lft.RemoteBAM;
var RemoteBAI = lft.RemoteBAI;

var Settings = require('./settings.jsx');
var getRequiresCredentials = Settings.getRequiresCredentials;

var Promise = require('es6-promise').Promise;
var Loader = require('react-loader');


var LoadBatch = React.createClass({

  getInitialState() {
    return {
      connection: '',
      sessions: '',
    };
  },

  handleConnection(connection) {
    this.setState({connection: connection});
  },

  handleGoQC(e) {
    e.preventDefault();
    this.props.handleGoQC(this.state.sessions);
  },

  handleGoBack(e) {
    e.preventDefault();
    this.props.handleGoIntro();
  },

  handleSessions(sessions) {
    this.setState({sessions: sessions});
  },

  render() {
    console.log('handleGoBatch');
    return (
      <div>
        <Grid>
          <Row className='show-grid'>
            <Col md={3}></Col>
            <Col md={6}>
              <TitlePanel />
              <SelectConnectionPanel settings={this.props.settings} handleConnection={this.handleConnection} />
              <LoadFilePanel settings={this.props.settings} connection={this.state.connection} handleSessions={this.handleSessions}/>
              <Pager>
                <PageItem previous href='#' onClick={this.handleGoBack}>&larr; Cancel, Return To Main Menu</PageItem>
                <PageItem next href='#' onClick={this.handleGoQC}>Proceed to QC &rarr;</PageItem>
              </Pager>
            </Col>
            <Col md={3}></Col>
          </Row>
        </Grid>
      </div>
    );
  }
});

var TitlePanel = React.createClass({

  render: function() {
    return (
      <Panel>
        <h4>Batch Mode</h4>
      </Panel>
    );
  }

});

var LoadFilePanel = React.createClass({
  
  getInitialState() {
    return {loaded: false,
            loading: false,
            error: '',
            nSessions: 0,
            nVariants: 0 };
  },

  handleSessions(sessions) {
    this.setState({nSessions: sessions.getNumSessions(),
                   nVariants: sessions.getNumVariants(),
                   loaded: true});
    console.log(this.state);
    this.props.handleSessions(sessions);
  },

  parseJSON(jso, filename) {
    // There are two different types of JSON formats ( see docs) so
    // need to figure out which one is being used.
    console.log(filename);
    console.log(jso);
    // var prefix = getPrefix(this.props.settings, this.props.connection);
    var connection = this.props.settings.servers[this.props.connection];
    var sessions = jso["sessions"];    
    var ss = new Sessions();
    var re_dna_location = /[chr]*[0-9,m,x,y]+[-:,\s]+\w+/i;

    for (var i=0; i<sessions.length; i++) {
      if (!sessions[i]['variants'] || !sessions[i]['bams']) {
        // this.renderFileLoadingErrorList('<strong>Error</strong>: ill-formed JSON in ' + filename + '. Check file syntax at <a href="http://jsonlint.com/">http://jsonlint.com/</a>');
        continue;
      }
      var s = new Session();
      var v = sessions[i]["variants"];
      s.addVariants(v);
      //s.variantFile = new RemoteVariantFile(this.settings.serverLocation + );
      for (var bi=0; bi<sessions[i]["bams"].length; bi++) {
        // Add prefix to the file then create the RemoteBAM
        var file = getURL(sessions[i]["bams"][bi], connection);
        console.log(file);
        s.addBam(file, connection);
      }
      ss.sessions.push(s);
    }
    this.handleSessions(ss);
    
  },

  // digestFile(file) {
  //   var file = React.findDOMNode(this.refs.file).files[0];
  //   console.log(file);
  //   console.log('here');
  //   if (getExtension(file) === 'json') {
  //     textGet(file).then((result) => {
  //       this.parseJSON(JSON.parse(result), file.name);
  //     }).catch((error) => {
  //       console.log(error);
  //     }).then(() => {
  //       console.log('FINISHED EVERYTHING');
  //     });
      
  //     // var reader = new FileReader();
  //     // reader.readAsText(file);
  //     // reader.onload = () => {
  //     //   this.parseJSON(JSON.parse(reader.result), file.name);
  //     // }
  //   }
  // },

  // loadFilePromise() {
  //   return new Promise((fulfill, reject) => {
  //     this.digestFile(file).done(() => {
  //       fulfill()
  //     })
  //   }
  // }
  handleFileLoad(file) {

    this.setState({ loading: true });
    var file = React.findDOMNode(this.refs.file).files[0];
    console.log(file);
    console.log('here');
    var ext = getExtension(file)
    if (ext === 'json') {
      localTextGet(file).then((result) => {
        this.parseJSON(JSON.parse(result), file.name);
      }).catch((error) => {
        this.setState({error: error});
      }).then(() => {
        console.log('FINISHED EVERYTHING');
        // this.setState({ loaded: true });
      });
    } else {
      this.setState({loaded: false,
                     error: 'Batch file must have json extension, found the following instead: ' + ext});
    }
  },

  render() {
    var options = {
      lines: 13,
      length: 5,
      width: 3,
      radius: 6,
      corners: 1,
      rotate: 0,
      direction: 1,
      color: '#000',
      speed: 1,
      trail: 60,
      shadow: false,
      hwaccel: false,
      zIndex: 2e9,
      top: '50%',
      left: '50%',
      scale: 1.00
    };

    if (this.state.loading) {
      var child;
      if (this.state.error) {
        child = (<b>{this.state.error}</b>);
      } else {
        child = (<b>Found {this.state.nSessions} sessions with a total of {this.state.nVariants} variants</b>);
      }
      var panelStyle = {
        backgroundColor: '#EEFFEB'
      };
      var loadNode = (
        <Loader loaded={this.state.loaded} options={options}>
          <Panel className="someTopMargin" style={panelStyle} >
            {child}
          </Panel>
        </Loader>
      );
    }

    return (
      <Panel>
        <h4>Select Batch File</h4>
        <p>
          Select a local JSON file containing a list of sessions. Consult the help for a detailed description of the expected format.
        </p>
        <input type="file" ref="file" onChange={this.handleFileLoad} />
        {loadNode}
      </Panel>
    );
  }

});

var SelectConnectionPanel = React.createClass({
  handleChange() {
    var connection = this.refs.connection.getValue();
    console.log(connection);
    this.props.handleConnection(connection);
  },

  componentDidMount() {
    this.handleChange();
  },

  render() {
    return (
      <Panel>
        <h4>Select Connection Type</h4>
        <p>
          In the batch mode, a JSON file lists the variants/variant files and sequencing data located either on a remote server or through a local server (see help for more info). Please select the a means of accessing the files listed in your JSON file.
        </p>
        <Input type="select" ref="connection" label="Select connection" placeholder="select" onChange={this.handleChange}>
          <option value="remoteHTTP">Remote HTTP : &nbsp; {this.props.settings.servers.remoteHTTP.location}</option>
          <option value="localHTTP">Local HTTP : &nbsp; {this.props.settings.servers.localHTTP.location}</option>
          <option value="SSHBridge">SSH-Bridge : &nbsp; {this.props.settings.servers.SSHBridge.username}@{this.props.settings.servers.SSHBridge.remoteSSHServer}</option>
        </Input>
      </Panel>
    );
  }
});



module.exports = LoadBatch;