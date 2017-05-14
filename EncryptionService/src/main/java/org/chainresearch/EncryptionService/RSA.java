package org.chainresearch.EncryptionService;

import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

import javax.crypto.Cipher;

public class RSA {
	static final String ALGORITHM_RSA = "RSA";
	static final String ALGORITHM_SIGN = "MD5withRSA";
	//static String publicKey = null;
	//static String privateKey = null;

	public static void main(String[] args) throws Exception {
		// 生成公钥和私钥
		// generatorKeyPair();

		String publicKey = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4yN1t8n+HcJonObMplh5kuAkQ5LIlQsDa3VNzaIMldXg5IJGzjW94nnAZ78+aHFkVBTQEuoiXTdw2inYe7HpoquY9hOmZ422LwY8yb6BIZ6R3FXbEsypSzS1ub2d4/nviVYwyP2riDzI3df+ScA8NrdbYJ01ssMpk6XXhDGVHYJIHZc4KYcEhjhMvAAMNleniUXOxvG1DYv+Non2hLxc3UzoD+ceWWpkY6rtfJ/Rg/yoGyWkbtxZmIkgwxXImHbPPdYFPCYtuXUwiKn7T1iE/QVaygny/CiLHuf43JKozN5QeT9t2+vmDVsc1Eo4OXmKvs3G3WbtrIZUZmXKPRKCOwIDAQAB";
		String privateKey = "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDjI3W3yf4dwmic5symWHmS4CRDksiVCwNrdU3NogyV1eDkgkbONb3iecBnvz5ocWRUFNAS6iJdN3DaKdh7semiq5j2E6ZnjbYvBjzJvoEhnpHcVdsSzKlLNLW5vZ3j+e+JVjDI/auIPMjd1/5JwDw2t1tgnTWywymTpdeEMZUdgkgdlzgphwSGOEy8AAw2V6eJRc7G8bUNi/42ifaEvFzdTOgP5x5ZamRjqu18n9GD/KgbJaRu3FmYiSDDFciYds891gU8Ji25dTCIqftPWIT9BVrKCfL8KIse5/jckqjM3lB5P23b6+YNWxzUSjg5eYq+zcbdZu2shlRmZco9EoI7AgMBAAECggEBANI7ePKyuEztKwzGpvb0fxpN8eLFkng5KGImweupqMJqoux+FHE61tUvYcHlBit/gKA+X1SSd1oWPZMAFkpvItOYxkxFZckFJnIh8NO+SyFF9rWcldexrKRaVjVj5ycip+5S43a1LDY+JKEJEWlLz6/JSH+FIzWhY/MwFelaRy12MRr1GX9Cs4xaFrc2ZqqPZpzzKctUbqRN7FHWedm6xALILfCJbHkkANtbNDHZGoZj57kQMt2f+vH2KGVBVw6jvDPu4QQjU1lso7ZeOY9wf9VJ9sb3CaWFw9gFoWxCT+C3uG5Ddl1CAl/AmcJGl5pLs+ar1VYLLevFaOuZkbHI30ECgYEA+FukdUjs8rLilt+zET/bPwakipmvDznumQPN9Y7exyFrR+0y873k/AmYgK16BiGY/1Bmw4ItBjPt/q5N6fx5mTyBcdOiqp5OXJsZtAUkGfpu6PRTHnBO/bFs1vuvz8V+EzwInHb0msh4bQWTUZ12bfZPfWWoBMWqZt9Qdh4NGWECgYEA6iCrCyT8qUNHuEK5FqCNObfab44peUUIis5wgxjdwk+OyUJuOR99AlumbdnzS/35OyK9Txek4vJ76w4TZjIH02HQmS+QOL7E4MU2o6peWqcvWtNy2vVz9reJe9bRTJOfdGT7i5MgTv8i8Floy8XeMTqg6zl1zj8avXVQUI7H9RsCgYBQt9g3lkAMkT87sfDNBmgHj+0ibtiKplV5vdbOnGSja6Umd108AtfNYoECMV+bZogHUuZTXJetkGslfxkrlzceKqAXkqUnttPZHT+5VoJpPw+U/vOUzQOfSG8LYDm/2XwkXDqgP7k4JTeel1VODVNUYd1r8AIvqt67GJFaEmJHgQKBgQCHRGiN/8iaYmzFYIdfM1NkzXw+h3wevGu7Bpqqo2s8IIr2bJMSHccz3Y/CV/HhLdMY/3EwiRCSrlY579/1Y2JyFklWt8wzfMRyuH5hAMWSypTpfNEXAEkHefLMwcga3g96R/2tHkvEWFPvWTjawm8lMiJWxNPzXTIt0+GbKWMNkQKBgCF+ki9OEbPY2ba9oQzr/OPeiJh/QH6MCeF0LudChdHews1FSFTkJ5Gm0H4qtYuxLbcu6YqMXG91zs2csjnxPViFCKDjrSIpuzpHJrrncsGJnTZ0ONuwJInBEPZ256ekzI4guhnIsvatwdOwhq1zIHgiIkvjUIcsR8H8QnxCWA6t";
		String source = "我是程序猿！";
		System.out.println("加密前的数据：\r\n" + source);
		System.out.println("--------------------------公钥加密，私钥解密------------------------------");
		// 公钥加密
		String target = encryptionByPublicKey(source, publicKey);
		// 私钥解密
		decryptionByPrivateKey(target, privateKey);

		System.out.println("--------------------------私钥加密并且签名，公钥验证签名并且解密------------------------------");
		// 私钥加密
		target = encryptionByPrivateKey(source, privateKey);
		// 签名
		String sign = signByPrivateKey(target, privateKey);
		// 验证签名
		verifyByPublicKey(target, publicKey, sign);
		// 公钥解密
		decryptionByPublicKey(target, publicKey);

	}

	/**
	 * 生成密钥对
	 * 
	 * @throws Exception
	 */
	static KeyPairDTO generatorKeyPair() throws Exception {
		KeyPairDTO keyPareDto = new KeyPairDTO();
		KeyPairGenerator keyPairGen = KeyPairGenerator.getInstance(ALGORITHM_RSA);
		keyPairGen.initialize(2048);
		KeyPair keyPair = keyPairGen.generateKeyPair();
		RSAPublicKey rsaPublicKey = (RSAPublicKey) keyPair.getPublic();
		byte[] keyBs = rsaPublicKey.getEncoded();
		// publicKey = encodeBase64(keyBs);
		keyPareDto.setPublicKey(encodeBase64(keyBs));
		// System.out.println("生成的公钥：\r\n" + publicKey);
		RSAPrivateKey rsaPrivateKey = (RSAPrivateKey) keyPair.getPrivate();
		keyBs = rsaPrivateKey.getEncoded();
		// privateKey = encodeBase64(keyBs);
		keyPareDto.setPrivateKey(encodeBase64(keyBs));

		// System.out.println("生成的私钥：\r\n" + privateKey);
		return keyPareDto;
	}

	/**
	 * 获取公钥
	 * 
	 * @return
	 * @throws Exception
	 */
	static PublicKey getPublicKey(String publicKeyString) throws Exception {
		X509EncodedKeySpec publicKeySpec = new X509EncodedKeySpec(decodeBase64(publicKeyString));
		KeyFactory keyFactory = KeyFactory.getInstance(ALGORITHM_RSA);
		return keyFactory.generatePublic(publicKeySpec);
	}

	/**
	 * 获取私钥
	 * 
	 * @return
	 * @throws Exception
	 */
	static PrivateKey getPrivateKey(String privateKeyString) throws Exception {
		PKCS8EncodedKeySpec privateKeySpec = new PKCS8EncodedKeySpec(decodeBase64(privateKeyString));
		KeyFactory keyFactory = KeyFactory.getInstance(ALGORITHM_RSA);
		return keyFactory.generatePrivate(privateKeySpec);
	}

	/**
	 * 公钥加密
	 * 
	 * @param data
	 * @return
	 * @throws Exception
	 */
	static String encryptionByPublicKey(String source, String pubKey) throws Exception {
		PublicKey publicKey = getPublicKey(pubKey);
		Cipher cipher = Cipher.getInstance(publicKey.getAlgorithm());
		cipher.init(Cipher.ENCRYPT_MODE, publicKey);
		cipher.update(source.getBytes("UTF-8"));
		String target = encodeBase64(cipher.doFinal());
		//System.out.println("公钥加密后的数据：\r\n" + target);
		return target;
	}

	/**
	 * 公钥解密
	 * 
	 * @param target
	 * @throws Exception
	 */
	static String decryptionByPublicKey(String target, String publicKeyString) throws Exception {
		PublicKey publicKey = getPublicKey(publicKeyString);
		Cipher cipher = Cipher.getInstance(publicKey.getAlgorithm());
		cipher.init(Cipher.DECRYPT_MODE, publicKey);
		cipher.update(decodeBase64(target));
		String source = new String(cipher.doFinal(), "UTF-8");
		//System.out.println("公钥解密后的数据：\r\n" + source);
		return source;
	}

	/**
	 * 公钥验证签名
	 * 
	 * @return
	 * @throws Exception
	 */
	static boolean verifyByPublicKey(String target, String publicKeyString, String sign) throws Exception {
		PublicKey publicKey = getPublicKey(publicKeyString);
		Signature signature = Signature.getInstance(ALGORITHM_SIGN);
		signature.initVerify(publicKey);
		signature.update(target.getBytes("UTF-8"));
		if (signature.verify(decodeBase64(sign))) {
			//System.out.println("签名正确！");
			return true;
		} else {
			//System.out.println("签名错误！");
			return false;
		}
	}

	/**
	 * 私钥加密
	 * 
	 * @param data
	 * @return
	 * @throws Exception
	 */
	static String encryptionByPrivateKey(String source, String privateKeyString) throws Exception {
		PrivateKey privateKey = getPrivateKey(privateKeyString);
		Cipher cipher = Cipher.getInstance(privateKey.getAlgorithm());
		cipher.init(Cipher.ENCRYPT_MODE, privateKey);
		cipher.update(source.getBytes("UTF-8"));
		String target = encodeBase64(cipher.doFinal());
		//System.out.println("私钥加密后的数据：\r\n" + target);
		return target;
	}

	/**
	 * 私钥解密
	 * 
	 * @param target
	 * @throws Exception
	 */
	static String decryptionByPrivateKey(String target, String privateKeyString) throws Exception {
		PrivateKey privateKey = getPrivateKey(privateKeyString);
		Cipher cipher = Cipher.getInstance(privateKey.getAlgorithm());
		cipher.init(Cipher.DECRYPT_MODE, privateKey);
		cipher.update(decodeBase64(target));
		String source = new String(cipher.doFinal(), "UTF-8");
		//System.out.println("私钥解密后的数据：\r\n" + source);
		return source;
	}

	/**
	 * 私钥签名
	 * 
	 * @param target
	 * @return
	 * @throws Exception
	 */
	static String signByPrivateKey(String target, String privateKeyString) throws Exception {
		PrivateKey privateKey = getPrivateKey(privateKeyString);
		Signature signature = Signature.getInstance(ALGORITHM_SIGN);
		signature.initSign(privateKey);
		signature.update(target.getBytes("UTF-8"));
		String sign = encodeBase64(signature.sign());
		//System.out.println("生成的签名：\r\n" + sign);
		return sign;
	}

	/**
	 * base64编码
	 * 
	 * @param source
	 * @return
	 * @throws Exception
	 */
	static String encodeBase64(byte[] source) throws Exception {
		return new String(Base64.getEncoder().encode(source), "UTF-8");
	}

	/**
	 * Base64解码
	 * 
	 * @param target
	 * @return
	 * @throws Exception
	 */
	static byte[] decodeBase64(String target) throws Exception {
		return Base64.getDecoder().decode(target.getBytes("UTF-8"));
	}
}
