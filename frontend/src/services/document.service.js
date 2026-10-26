import api from './api';

export const getDocuments = async (search = '') => {
  const params = search ? { search } : {};
  const response = await api.get('/documents', { params });
  return response.data.documents;
};

export const uploadDocument = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onUploadProgress(percent);
      }
    },
  });
  return response.data.document;
};

export const downloadDocument = async (id, fileName) => {
  const response = await api.get(`/documents/${id}/download`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName || 'document');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const previewDocument = async (id) => {
  const response = await api.get(`/documents/${id}/preview`, {
    responseType: 'blob',
  });
  return {
    blobUrl: window.URL.createObjectURL(new Blob([response.data], { type: response.headers['content-type'] })),
    contentType: response.headers['content-type']
  };
};

export const deleteDocument = async (id) => {
  const response = await api.delete(`/documents/${id}`);
  return response.data;
};
