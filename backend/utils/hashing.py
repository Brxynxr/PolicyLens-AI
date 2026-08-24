import hashlib
import os


def calcular_hash(ruta_archivo: str) -> str:
    """
    Calcula el hash SHA-256 de un archivo leyéndolo en bloques binarios de 64 KB.
    
    :param ruta_archivo: Ruta absoluta o relativa del archivo.
    :return: String hexadecimal del hash SHA-256 (64 caracteres).
    :raises FileNotFoundError: Si el archivo no existe en la ruta especificada.
    """
    if not os.path.exists(ruta_archivo):
        raise FileNotFoundError(f"El archivo especificado no existe: {ruta_archivo}")

    sha256 = hashlib.sha256()
    with open(ruta_archivo, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            sha256.update(block)

    return sha256.hexdigest()
