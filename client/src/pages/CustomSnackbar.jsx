import * as React from 'react';
import { Transition } from 'react-transition-group';
import { styled } from '@mui/system';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloseIcon from '@mui/icons-material/Close';
import { Snackbar } from '@mui/base/Snackbar';

const CustomSnackbar = ({ message, description, open, onClose, duration = 5000 }) => {
  const nodeRef = React.useRef(null);

  const handleClose = (_, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    onClose();
  };

  return (
    <StyledSnackbar
      autoHideDuration={duration}
      open={open}
      onClose={handleClose}
    >
      <Transition
        timeout={{ enter: 400, exit: 400 }}
        in={open}
        appear
        unmountOnExit
        nodeRef={nodeRef}
      >
        {(status) => (
          <SnackbarContent
            style={{
              transform: positioningStyles[status],
              transition: 'transform 300ms ease',
            }}
            ref={nodeRef}
          >
            <CheckRoundedIcon
              sx={{
                color: 'success.main',
                flexShrink: 0,
                width: '1.25rem',
                height: '1.5rem',
              }}
            />
            <div className="snackbar-message">
              <p className="snackbar-title">{message}</p>
              {description && (
                <p className="snackbar-description">
                  {description}
                </p>
              )}
            </div>
            <CloseIcon onClick={handleClose} className="snackbar-close-icon" />
          </SnackbarContent>
        )}
      </Transition>
    </StyledSnackbar>
  );
};

// Styling configurations
const grey = {
  50: '#F3F6F9',
  100: '#E5EAF2',
  200: '#DAE2ED',
  300: '#C7D0DD',
  400: '#B0B8C4',
  500: '#9DA8B7',
  600: '#6B7A90',
  700: '#434D5B',
  800: '#303740',
  900: '#1C2025',
};

const StyledSnackbar = styled(Snackbar)`
  position: fixed;
  z-index: 5500;
  display: flex;
  bottom: 16px;
  right: 16px;
  max-width: 560px;
  min-width: 300px;
`;

const SnackbarContent = styled('div')(
  ({ theme }) => `
  display: flex;
  gap: 8px;
  overflow: hidden;
  background-color: ${theme.palette.mode === 'dark' ? grey[900] : '#fff'};
  border-radius: 8px;
  border: 1px solid ${theme.palette.mode === 'dark' ? grey[700] : grey[200]};
  box-shadow: ${
    theme.palette.mode === 'dark'
      ? `0 2px 16px rgba(0,0,0, 0.5)`
      : `0 2px 16px ${grey[200]}`
  };
  padding: 0.75rem;
  color: ${theme.palette.mode === 'dark' ? grey[50] : grey[900]};
  font-family: 'IBM Plex Sans', sans-serif;
  font-weight: 500;
  text-align: start;
  position: relative;

  & .snackbar-message {
    flex: 1 1 0%;
    max-width: 100%;
  }

  & .snackbar-title {
    margin: 0;
    line-height: 1.5rem;
    margin-right: 0.5rem;
  }

  & .snackbar-description {
    margin: 0;
    line-height: 1.5rem;
    font-weight: 400;
    color: ${theme.palette.mode === 'dark' ? grey[400] : grey[800]};
  }

  & .snackbar-close-icon {
    cursor: pointer;
    flex-shrink: 0;
    padding: 2px;
    border-radius: 4px;

    &:hover {
      background: ${theme.palette.mode === 'dark' ? grey[800] : grey[50]};
    }
  }
  `,
);

const positioningStyles = {
  entering: 'translateX(0)',
  entered: 'translateX(0)',
  exiting: 'translateX(500px)',
  exited: 'translateX(500px)',
  unmounted: 'translateX(500px)',
};

export default CustomSnackbar;
