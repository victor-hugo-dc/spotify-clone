import axios from 'axios';

const makeAxiosRequest = (endpoint) => {
  const source = axios.CancelToken.source();

  const makeRequest = async () => {
    const { token } = source;
    const config = {
      method: 'GET',
      url: endpoint,
      headers: { Authorization: 'Bearer ' + localStorage.getItem('token') },
      cancelToken: token,
    };
    
    try {
      const { data } = await axios(config);
      return data;
    } catch (error) {
      if (axios.isCancel(error)) return;
      throw error;
    }
  };
  
  return [source, makeRequest];
};

export default makeAxiosRequest;
