const Taro = {
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  navigateTo: jest.fn(),
  navigateBack: jest.fn(),
  showToast: jest.fn(),
  showModal: jest.fn(),
  vibrateShort: jest.fn(),
  request: jest.fn(),
  connectSocket: jest.fn(),
  useRouter: jest.fn(() => ({ params: {} })),
  getCurrentInstance: jest.fn(() => ({ router: { params: {} } })),
};

export default Taro;
export const {
  getStorageSync,
  setStorageSync,
  removeStorageSync,
  navigateTo,
  navigateBack,
  showToast,
  showModal,
  vibrateShort,
  request,
  connectSocket,
  useRouter,
  getCurrentInstance,
} = Taro;
