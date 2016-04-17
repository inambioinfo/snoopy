import paramiko
import os
import json
import base64
import logging
import pdb
from tornado import gen

class SSHBridge(object):
    """
    SSHBridge(username, hostname)

    Establishes a SSH connection to username@hostname. Returns
     - (txt, json) from the host machine with `cat`. Returned as plaintext.
     - (bam, cram) from the host machine with `samtools view`. Returned as
       json for use with Dallinace's samjson source adapter.

    """

    def __init__(self, username, password, hostname):

        # set up logging
        paramiko.util.log_to_file('ssh.log')
        logging.getLogger("paramiko").setLevel(logging.WARNING) 
        client = paramiko.SSHClient()
        client.load_system_host_keys()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname,
            username=username,
            password=base64.b64decode(password)
            )
        self._client = client
        self._SAM_KEYS = {
            'QNAME':0,
            'FLAG':1,
            'RNAME':2,
            'POS':3,
            'MAPQ':4,
            'CIGAR':5,
            'SEQ':9,
            'QUAL':10
        }

    @property
    def username(self):
        return self._username

    @property
    def hostname(self):
        return self._hostname

    def _send(self, command):
        ssh_stdin, ssh_stdout, ssh_stderr = self._client.exec_command(command)
        # pdb.set_trace()
        # This causes the function to hang
        # for error in ssh_stderr:
        #     if error.find('fail to open') >= 0:
        #         return False
        return ssh_stdout


    @gen.coroutine
    def fetch_plaintext(self, path):
        ftype = os.path.splitext(path)[1].lower()
        # if ftype in ('.txt', '.json'):
        c = 'cat {}'.format(path)
        stdout = self._send(c)
        if not stdout:
            return False
        return stdout.read()



    @gen.coroutine
    def fetch_sequence(self, path, chrom, start, end):
        """
        Fetches either sequence data or txt, json with the established
        client.

        Parameters
        ----------
        path : str
            The path to the file on the server that wants to be fetched.
        chrom : str
            The chromosome at path. Relevant only if path points to a sequence
            (bam, cram) file
        start : str
            The minimum sequence coordinate/location to be fetched, if path
            points to a sequence (bam, cram) file
        end : str
            The maximum sequence coordinate/location to be fetched, if path
            points to a sequence (bam, cram) file

        Returns
        -------
        string : str
            Either a json string dump for sequence files or the plaintext for
            txt, json files.
        """

        ftype = os.path.splitext(path)[1].lower()
        if ftype in ('.bam', '.cram'):
            c = 'samtools view {} {}:{}-{}'.format(path, chrom, start, end)
            stdout = self._send(c)
            if not stdout:
                return False
            return self.parse_samtools_view(stdout)

    def parse_samtools_view(self, samtools_view_output):
        """
        Parses the output of a samtools view command into a json string dump.

        Parameters
        ----------
        samtools_view_output : str
            A string of the returned samtools view output.

        Returns
        -------
        string : str
            A json string dump which is has been parsed so to be readily
            interpretred by Dalliance's samjson source adapter.

        """

        listofdicts = []
        for line in samtools_view_output:
            d = {}
            parts = line.split('\t')
            d['pos'] = int(parts[self._SAM_KEYS['POS']])
            # d['len'] = len(parts[self._SAM_KEYS['SEQ']])
            d['segment'] = parts[self._SAM_KEYS['RNAME']]
            d['readName'] = parts[self._SAM_KEYS['QNAME']]
            d['mq'] = int(parts[self._SAM_KEYS['MAPQ']])
            d['cigar'] = parts[self._SAM_KEYS['CIGAR']]
            d['seq'] = parts[self._SAM_KEYS['SEQ']]
            d['quals'] = parts[self._SAM_KEYS['QUAL']]
            d['flag'] = int(parts[self._SAM_KEYS['FLAG']])
            listofdicts.append(d)

        return json.dumps(listofdicts)
