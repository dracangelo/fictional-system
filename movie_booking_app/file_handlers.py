"""
Secure file upload handling for the movie booking app
"""
import os
import uuid
import hashlib
import mimetypes
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError
import logging

# Optional imports
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False

logger = logging.getLogger(__name__)


class SecureFileHandler:
    """
    Secure file upload handler with validation and sanitization
    """
    
    # Maximum file sizes by type (in bytes)
    MAX_FILE_SIZES = {
        'image': 5 * 1024 * 1024,    # 5MB for images
        'video': 50 * 1024 * 1024,   # 50MB for videos
        'document': 10 * 1024 * 1024, # 10MB for documents
    }
    
    # Allowed file types
    ALLOWED_TYPES = {
        'image': {
            'extensions': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
            'mime_types': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        },
        'video': {
            'extensions': ['.mp4', '.mov', '.avi', '.mkv'],
            'mime_types': ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
        },
        'document': {
            'extensions': ['.pdf'],
            'mime_types': ['application/pdf'],
        }
    }
    
    # Dangerous file signatures to check for
    DANGEROUS_SIGNATURES = [
        b'\x4D\x5A',  # PE executable
        b'\x7F\x45\x4C\x46',  # ELF executable
        b'\xCA\xFE\xBA\xBE',  # Java class file
        b'\x50\x4B\x03\x04',  # ZIP file (could contain executables)
    ]
    
    def __init__(self, file_type='image'):
        """
        Initialize the secure file handler
        
        Args:
            file_type (str): Type of file ('image', 'video', 'document')
        """
        self.file_type = file_type
        self.max_size = self.MAX_FILE_SIZES.get(file_type, 5 * 1024 * 1024)
        self.allowed_extensions = self.ALLOWED_TYPES.get(file_type, {}).get('extensions', [])
        self.allowed_mime_types = self.ALLOWED_TYPES.get(file_type, {}).get('mime_types', [])
    
    def validate_file(self, uploaded_file):
        """
        Comprehensive file validation
        
        Args:
            uploaded_file: Django UploadedFile object
            
        Returns:
            bool: True if file is valid
            
        Raises:
            ValidationError: If file is invalid
        """
        # Check file size
        if uploaded_file.size > self.max_size:
            raise ValidationError(
                f"File size ({uploaded_file.size} bytes) exceeds maximum allowed size "
                f"({self.max_size} bytes) for {self.file_type} files"
            )
        
        # Check file extension
        file_extension = self.get_file_extension(uploaded_file.name)
        if file_extension not in self.allowed_extensions:
            raise ValidationError(
                f"File extension '{file_extension}' not allowed for {self.file_type} files. "
                f"Allowed extensions: {', '.join(self.allowed_extensions)}"
            )
        
        # Check MIME type using python-magic for accurate detection (if available)
        uploaded_file.seek(0)
        file_content = uploaded_file.read(1024)  # Read first 1KB
        uploaded_file.seek(0)  # Reset file pointer
        
        if MAGIC_AVAILABLE:
            detected_mime = magic.from_buffer(file_content, mime=True)
            if detected_mime not in self.allowed_mime_types:
                raise ValidationError(
                    f"File type '{detected_mime}' not allowed for {self.file_type} files. "
                    f"Allowed types: {', '.join(self.allowed_mime_types)}"
                )
        else:
            # Fallback to basic MIME type checking
            mime_type, _ = mimetypes.guess_type(uploaded_file.name)
            if mime_type and mime_type not in self.allowed_mime_types:
                raise ValidationError(
                    f"File type '{mime_type}' not allowed for {self.file_type} files. "
                    f"Allowed types: {', '.join(self.allowed_mime_types)}"
                )
        
        # Check for dangerous file signatures
        self.check_file_signatures(file_content)
        
        # Perform type-specific validation
        if self.file_type == 'image':
            self.validate_image(uploaded_file)
        elif self.file_type == 'video':
            self.validate_video(uploaded_file)
        elif self.file_type == 'document':
            self.validate_document(uploaded_file)
        
        return True
    
    def get_file_extension(self, filename):
        """Get file extension in lowercase"""
        return os.path.splitext(filename.lower())[1]
    
    def check_file_signatures(self, file_content):
        """Check for dangerous file signatures"""
        for signature in self.DANGEROUS_SIGNATURES:
            if file_content.startswith(signature):
                raise ValidationError("File contains dangerous content")
    
    def validate_image(self, uploaded_file):
        """Validate image files using PIL (if available)"""
        if not PIL_AVAILABLE:
            # Skip image validation if PIL is not available
            return
            
        try:
            uploaded_file.seek(0)
            with Image.open(uploaded_file) as img:
                # Verify it's a valid image
                img.verify()
                
                # Check image dimensions (prevent extremely large images)
                if img.width > 4000 or img.height > 4000:
                    raise ValidationError("Image dimensions too large (max 4000x4000)")
                
                # Check for minimum dimensions
                if img.width < 10 or img.height < 10:
                    raise ValidationError("Image dimensions too small (min 10x10)")
                
        except Exception as e:
            raise ValidationError(f"Invalid image file: {str(e)}")
        finally:
            uploaded_file.seek(0)
    
    def validate_video(self, uploaded_file):
        """Validate video files"""
        # Basic validation - could be extended with ffmpeg for more thorough checks
        if uploaded_file.size < 1000:  # Very small file, likely not a valid video
            raise ValidationError("Video file appears to be corrupted or too small")
    
    def validate_document(self, uploaded_file):
        """Validate document files"""
        # For PDF files, we can do basic validation
        uploaded_file.seek(0)
        header = uploaded_file.read(4)
        uploaded_file.seek(0)
        
        if header != b'%PDF':
            raise ValidationError("Invalid PDF file")
    
    def generate_secure_filename(self, original_filename):
        """
        Generate a secure filename
        
        Args:
            original_filename (str): Original filename
            
        Returns:
            str: Secure filename
        """
        # Get file extension
        file_extension = self.get_file_extension(original_filename)
        
        # Generate unique identifier
        unique_id = str(uuid.uuid4())
        
        # Create hash of original filename for reference
        filename_hash = hashlib.md5(original_filename.encode()).hexdigest()[:8]
        
        # Create secure filename
        secure_filename = f"{filename_hash}_{unique_id}{file_extension}"
        
        return secure_filename
    
    def sanitize_image(self, uploaded_file):
        """
        Sanitize image by re-encoding it (removes potential malicious metadata)
        
        Args:
            uploaded_file: Django UploadedFile object
            
        Returns:
            ContentFile: Sanitized image file
        """
        if not PIL_AVAILABLE:
            # Return original file if PIL is not available
            return uploaded_file
            
        try:
            uploaded_file.seek(0)
            with Image.open(uploaded_file) as img:
                # Convert to RGB if necessary (removes potential issues with other modes)
                if img.mode not in ('RGB', 'RGBA'):
                    img = img.convert('RGB')
                
                # Save to bytes buffer
                from io import BytesIO
                buffer = BytesIO()
                
                # Determine format
                format_map = {
                    '.jpg': 'JPEG',
                    '.jpeg': 'JPEG',
                    '.png': 'PNG',
                    '.gif': 'GIF',
                    '.webp': 'WEBP',
                }
                
                file_extension = self.get_file_extension(uploaded_file.name)
                image_format = format_map.get(file_extension, 'JPEG')
                
                # Save with optimization
                save_kwargs = {'format': image_format, 'optimize': True}
                if image_format == 'JPEG':
                    save_kwargs['quality'] = 85
                
                img.save(buffer, **save_kwargs)
                buffer.seek(0)
                
                # Create new ContentFile
                sanitized_file = ContentFile(
                    buffer.getvalue(),
                    name=uploaded_file.name
                )
                
                return sanitized_file
                
        except Exception as e:
            logger.error(f"Error sanitizing image: {str(e)}")
            raise ValidationError(f"Error processing image: {str(e)}")
    
    def save_file(self, uploaded_file, folder='uploads'):
        """
        Save file securely with validation and sanitization
        
        Args:
            uploaded_file: Django UploadedFile object
            folder (str): Folder to save file in
            
        Returns:
            str: Path to saved file
        """
        # Validate file
        self.validate_file(uploaded_file)
        
        # Generate secure filename
        secure_filename = self.generate_secure_filename(uploaded_file.name)
        
        # Create full path
        file_path = os.path.join(folder, self.file_type, secure_filename)
        
        # Sanitize image files
        if self.file_type == 'image':
            sanitized_file = self.sanitize_image(uploaded_file)
            saved_path = default_storage.save(file_path, sanitized_file)
        else:
            saved_path = default_storage.save(file_path, uploaded_file)
        
        # Log successful upload
        logger.info(f"File uploaded successfully: {saved_path}")
        
        return saved_path
    
    def delete_file(self, file_path):
        """
        Securely delete a file
        
        Args:
            file_path (str): Path to file to delete
            
        Returns:
            bool: True if deleted successfully
        """
        try:
            if default_storage.exists(file_path):
                default_storage.delete(file_path)
                logger.info(f"File deleted successfully: {file_path}")
                return True
            else:
                logger.warning(f"File not found for deletion: {file_path}")
                return False
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {str(e)}")
            return False


class MediaUploadHandler:
    """
    Handler for event and movie media uploads
    """
    
    def __init__(self):
        self.image_handler = SecureFileHandler('image')
        self.video_handler = SecureFileHandler('video')
    
    def upload_event_media(self, files, event_id):
        """
        Upload media files for an event
        
        Args:
            files (list): List of uploaded files
            event_id (int): Event ID
            
        Returns:
            list: List of uploaded file paths
        """
        uploaded_files = []
        
        for uploaded_file in files:
            try:
                # Determine file type
                file_extension = SecureFileHandler('image').get_file_extension(uploaded_file.name)
                
                if file_extension in SecureFileHandler.ALLOWED_TYPES['image']['extensions']:
                    handler = self.image_handler
                elif file_extension in SecureFileHandler.ALLOWED_TYPES['video']['extensions']:
                    handler = self.video_handler
                else:
                    raise ValidationError(f"Unsupported file type: {file_extension}")
                
                # Save file
                file_path = handler.save_file(uploaded_file, f'events/{event_id}')
                uploaded_files.append({
                    'path': file_path,
                    'type': handler.file_type,
                    'original_name': uploaded_file.name,
                    'size': uploaded_file.size
                })
                
            except ValidationError as e:
                logger.warning(f"File upload failed for {uploaded_file.name}: {str(e)}")
                # Continue with other files, but log the error
                continue
        
        return uploaded_files
    
    def delete_event_media(self, media_list):
        """
        Delete media files for an event
        
        Args:
            media_list (list): List of media file info
            
        Returns:
            bool: True if all files deleted successfully
        """
        success = True
        
        for media_info in media_list:
            file_path = media_info.get('path')
            if file_path:
                if media_info.get('type') == 'image':
                    success &= self.image_handler.delete_file(file_path)
                elif media_info.get('type') == 'video':
                    success &= self.video_handler.delete_file(file_path)
        
        return success


# Utility functions for views
def handle_file_upload(request, file_type='image', folder='uploads'):
    """
    Utility function to handle file uploads in views
    
    Args:
        request: Django request object
        file_type (str): Type of file to handle
        folder (str): Folder to save file in
        
    Returns:
        dict: Upload result with file path or error
    """
    if 'file' not in request.FILES:
        return {'error': 'No file provided'}
    
    uploaded_file = request.FILES['file']
    handler = SecureFileHandler(file_type)
    
    try:
        file_path = handler.save_file(uploaded_file, folder)
        return {
            'success': True,
            'file_path': file_path,
            'original_name': uploaded_file.name,
            'size': uploaded_file.size
        }
    except ValidationError as e:
        return {'error': str(e)}
    except Exception as e:
        logger.error(f"Unexpected error during file upload: {str(e)}")
        return {'error': 'File upload failed'}