package org.chainresearch.EncryptionService;

import javax.servlet.http.HttpServletRequest;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class EncriptionController {

	@RequestMapping(value = "/encrypt", method = RequestMethod.POST)
	public String encrypt(HttpServletRequest request, @RequestParam(value = "key") String key,
			@RequestParam(value = "source") String source) {
		String target = "";
		try {
			target = RSA.encryptionByPrivateKey(source, key);
		} catch (Exception e) {
			e.printStackTrace();
		}
		return target;
	}

	@RequestMapping(value = "/decrypt", method = RequestMethod.POST)
	public String decrypt(HttpServletRequest request, @RequestParam(value = "key") String key,
			@RequestParam(value = "source") String source) {
		String target = "";
		try {
			// System.out.println(source);
			target = RSA.decryptionByPublicKey(source, key);

		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return target;
	}

	@RequestMapping(value = "/sign", method = RequestMethod.POST)
	public String sign(HttpServletRequest request, @RequestParam(value = "key") String key,
			@RequestParam(value = "source") String source) {
		String target = "";
		try {
			// System.out.println(source);
			target = RSA.signByPrivateKey(source, key);

		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return target;
	}
	@RequestMapping(value = "/verify", method = RequestMethod.POST)
	public boolean verify(HttpServletRequest request, @RequestParam(value = "key") String key,
			@RequestParam(value = "source") String source,@RequestParam(value = "sign") String sign) {
		boolean target = false;
		try {
			// System.out.println(source);
			target = RSA.verifyByPublicKey(source, key, sign);

		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		return target;
	}
	@RequestMapping("/generator")
	public KeyPairDTO generator() {
		try {
			return RSA.generatorKeyPair();
		} catch (Exception e) {
			// e.printStackTrace();
			return new KeyPairDTO();
		}
	}
}
