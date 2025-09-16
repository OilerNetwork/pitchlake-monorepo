import { Id, toast, TypeOptions } from "react-toastify";
const displayToast =
  (type: TypeOptions) =>
  (content: string, autoClose?: number | false, progress?: number) => {
    const id = toast(content, {
      type,
      position: "top-left",
      autoClose: autoClose ? autoClose : 5000,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: false,
      draggable: false,
      progress,
    });
    return id;
  };

export const updateToast = (
  id: Id,
  type: TypeOptions,
  render: string,
  autoClose?: number | false,
  progress?: string | number | undefined,
) => {
  toast.update(id, {
    render: render,
    type,
    autoClose,
    progress: undefined,
  });
};

export const displayToastSuccess = displayToast("success");
export const displayToastError = displayToast("error");
export const displayToastWarning = displayToast("warning");
export const displayToastInfo = displayToast("info");
