import { Component } from 'react';
import ErrorPage from '../pages/ErrorPage';

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App render error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage
          variant="unexpected"
          message="Một phần giao diện chưa thể hiển thị. Hãy thử tải lại trang hoặc quay về trang trước."
          fullScreen
        />
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
